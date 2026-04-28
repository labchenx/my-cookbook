import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { XhsDownloaderServiceSource, XhsDownloaderServiceState } from '../types';

type XhsDownloaderDevEnvironment = Partial<
  Record<
    'APPDATA' | 'PATH' | 'PATHEXT' | 'XHS_DOWNLOADER_API_BASE_URL' | 'XHS_DOWNLOADER_PROJECT_ROOT',
    string
  >
>;

type FetchLikeResponse = {
  ok: boolean;
};

type FetchLike = (
  input: string,
  init?: {
    method?: string;
    signal?: AbortSignal;
  },
) => Promise<FetchLikeResponse>;

type ChildProcessLike = Pick<ChildProcess, 'pid' | 'kill' | 'exitCode' | 'once'>;

type SpawnLike = (
  command: string,
  args: string[],
  options: {
    cwd: string;
    env: NodeJS.ProcessEnv;
    stdio: 'inherit';
    shell: boolean;
  },
) => ChildProcessLike;

type EnsureXhsDownloaderDevServiceDependencies = {
  env?: XhsDownloaderDevEnvironment;
  cwd?: string;
  fetcher?: FetchLike;
  pathExists?: (targetPath: string) => boolean;
  spawnProcess?: SpawnLike;
  sleep?: (ms: number) => Promise<void>;
  healthCheckAttempts?: number;
  healthCheckIntervalMs?: number;
  now?: () => string;
};

export type XhsDownloaderDevStatus = XhsDownloaderServiceState & {
  code:
    | 'existing_service'
    | 'managed_service'
    | 'missing_project_root'
    | 'project_root_not_found'
    | 'missing_uv'
    | 'start_failed'
    | 'healthcheck_timeout'
    | 'unknown';
  managedProcessId: number | null;
};

export type EnsureXhsDownloaderDevServiceResult = {
  status: XhsDownloaderDevStatus;
  childProcess: ChildProcessLike | null;
};

const xhsDownloaderStatusFileName = '.xhs-downloader-dev-status.json';

function defaultNow(): string {
  return new Date().toISOString();
}

function toNodeProcessEnv(env: XhsDownloaderDevEnvironment): NodeJS.ProcessEnv {
  return Object.entries(env).reduce<NodeJS.ProcessEnv>((result, [key, value]) => {
    if (typeof value === 'string') {
      result[key] = value;
    }

    return result;
  }, {});
}

export function getXhsDownloaderDevStatusPath(cwd = process.cwd()): string {
  return path.resolve(cwd, xhsDownloaderStatusFileName);
}

export function normalizeXhsDownloaderApiBaseUrl(env: XhsDownloaderDevEnvironment): string {
  const configuredBaseUrl = env.XHS_DOWNLOADER_API_BASE_URL?.trim() || 'http://127.0.0.1:5556';
  const parsedUrl = new URL(configuredBaseUrl);

  return parsedUrl.toString().replace(/\/+$/, '');
}

export function resolveXhsDownloaderProjectRoot(
  env: XhsDownloaderDevEnvironment,
  cwd = process.cwd(),
): string | null {
  const configuredRoot = env.XHS_DOWNLOADER_PROJECT_ROOT?.trim();

  if (!configuredRoot) {
    return null;
  }

  return path.resolve(cwd, configuredRoot);
}

function getPathEntries(env: XhsDownloaderDevEnvironment): string[] {
  return (env.PATH ?? process.env.PATH ?? '')
    .split(path.delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getExecutableNames(baseName: 'uv', env: XhsDownloaderDevEnvironment): string[] {
  if (process.platform !== 'win32') {
    return [baseName];
  }

  const pathExt = (env.PATHEXT ?? process.env.PATHEXT ?? '.EXE;.CMD;.BAT;.COM')
    .split(';')
    .map((extension) => extension.trim().toLowerCase())
    .filter(Boolean);

  return pathExt.map((extension) => `${baseName}${extension}`);
}

export function resolveUvExecutable(
  env: XhsDownloaderDevEnvironment,
  pathExists: (targetPath: string) => boolean = existsSync,
): string | null {
  const pathCandidates = getPathEntries(env).flatMap((directory) =>
    getExecutableNames('uv', env).map((name) => path.join(directory, name)),
  );
  const appData = env.APPDATA?.trim() || process.env.APPDATA?.trim();
  const fallbackCandidates =
    process.platform === 'win32'
      ? [
          appData ? path.join(appData, 'Python', 'Python312', 'Scripts', 'uv.exe') : null,
          path.join(os.homedir(), 'AppData', 'Roaming', 'Python', 'Python312', 'Scripts', 'uv.exe'),
          path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Python', 'Python312', 'Scripts', 'uv.exe'),
        ].filter((candidate): candidate is string => Boolean(candidate))
      : ['uv'];

  for (const candidate of [...pathCandidates, ...fallbackCandidates]) {
    if (pathExists(candidate)) {
      return candidate;
    }
  }

  return null;
}

function createStatus(
  values: Omit<XhsDownloaderDevStatus, 'updatedAt'> & { updatedAt?: string },
  now: () => string,
): XhsDownloaderDevStatus {
  return {
    ...values,
    updatedAt: values.updatedAt ?? now(),
  };
}

export function writeXhsDownloaderDevStatus(status: XhsDownloaderDevStatus, cwd = process.cwd()): void {
  writeFileSync(getXhsDownloaderDevStatusPath(cwd), JSON.stringify(status, null, 2), 'utf-8');
}

export function readXhsDownloaderDevStatus(cwd = process.cwd()): XhsDownloaderDevStatus | null {
  const statusPath = getXhsDownloaderDevStatusPath(cwd);

  if (!existsSync(statusPath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(statusPath, 'utf-8')) as XhsDownloaderDevStatus;
  } catch {
    return null;
  }
}

async function checkHealth(apiBaseUrl: string, fetcher: FetchLike): Promise<boolean> {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 2_000);

  try {
    const response = await fetcher(`${apiBaseUrl}/docs`, {
      method: 'GET',
      signal: abortController.signal,
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function ensureXhsDownloaderDevService(
  dependencies: EnsureXhsDownloaderDevServiceDependencies = {},
): Promise<EnsureXhsDownloaderDevServiceResult> {
  const env = dependencies.env ?? process.env;
  const cwd = dependencies.cwd ?? process.cwd();
  const fetcher = dependencies.fetcher ?? (fetch as FetchLike);
  const pathExists = dependencies.pathExists ?? existsSync;
  const spawnProcess =
    dependencies.spawnProcess ?? ((command, args, options) => spawn(command, args, options));
  const sleep =
    dependencies.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const healthCheckAttempts = dependencies.healthCheckAttempts ?? 20;
  const healthCheckIntervalMs = dependencies.healthCheckIntervalMs ?? 1_000;
  const now = dependencies.now ?? defaultNow;
  const apiBaseUrl = normalizeXhsDownloaderApiBaseUrl(env);
  const projectRoot = resolveXhsDownloaderProjectRoot(env, cwd);
  const projectRootConfigured = Boolean(env.XHS_DOWNLOADER_PROJECT_ROOT?.trim());

  if (await checkHealth(apiBaseUrl, fetcher)) {
    return {
      status: createStatus(
        {
          apiBaseUrl,
          available: true,
          source: 'existing',
          code: 'existing_service',
          projectRootConfigured,
          projectRoot,
          message: 'Reusing the already running XHS Downloader API service.',
          managedProcessId: null,
        },
        now,
      ),
      childProcess: null,
    };
  }

  if (!projectRootConfigured || !projectRoot) {
    return {
      status: createStatus(
        {
          apiBaseUrl,
          available: false,
          source: 'unavailable',
          code: 'missing_project_root',
          projectRootConfigured: false,
          projectRoot: null,
          message:
            'XHS_DOWNLOADER_PROJECT_ROOT is not configured, so XHS Downloader was not started automatically.',
          managedProcessId: null,
        },
        now,
      ),
      childProcess: null,
    };
  }

  if (!pathExists(projectRoot)) {
    return {
      status: createStatus(
        {
          apiBaseUrl,
          available: false,
          source: 'unavailable',
          code: 'project_root_not_found',
          projectRootConfigured: true,
          projectRoot,
          message: `XHS Downloader project root was not found: ${projectRoot}`,
          managedProcessId: null,
        },
        now,
      ),
      childProcess: null,
    };
  }

  const uvExecutable = resolveUvExecutable(env, pathExists);

  if (!uvExecutable) {
    return {
      status: createStatus(
        {
          apiBaseUrl,
          available: false,
          source: 'unavailable',
          code: 'missing_uv',
          projectRootConfigured: true,
          projectRoot,
          message: 'Could not find a usable uv executable. Install uv or make sure it is available in PATH.',
          managedProcessId: null,
        },
        now,
      ),
      childProcess: null,
    };
  }

  const childProcess = spawnProcess(uvExecutable, ['run', 'main.py', 'api'], {
    cwd: projectRoot,
    env: {
      ...toNodeProcessEnv(env),
      ...process.env,
    },
    stdio: 'inherit',
    shell: false,
  });
  let exitCode: number | null = null;

  childProcess.once('exit', (code) => {
    exitCode = code;
  });

  for (let attempt = 0; attempt < healthCheckAttempts; attempt += 1) {
    if (await checkHealth(apiBaseUrl, fetcher)) {
      return {
        status: createStatus(
          {
            apiBaseUrl,
            available: true,
            source: 'managed',
            code: 'managed_service',
            projectRootConfigured: true,
            projectRoot,
            message: 'Started XHS Downloader automatically for local development.',
            managedProcessId: childProcess.pid ?? null,
          },
          now,
        ),
        childProcess,
      };
    }

    if (typeof exitCode === 'number') {
      return {
        status: createStatus(
          {
            apiBaseUrl,
            available: false,
            source: 'unavailable',
            code: 'start_failed',
            projectRootConfigured: true,
            projectRoot,
            message: `XHS Downloader exited before it became healthy (exit code ${exitCode}).`,
            managedProcessId: childProcess.pid ?? null,
          },
          now,
        ),
        childProcess: null,
      };
    }

    await sleep(healthCheckIntervalMs);
  }

  childProcess.kill();

  return {
    status: createStatus(
      {
        apiBaseUrl,
        available: false,
        source: 'unavailable',
        code: 'healthcheck_timeout',
        projectRootConfigured: true,
        projectRoot,
        message: 'Timed out while waiting for XHS Downloader API to become healthy.',
        managedProcessId: childProcess.pid ?? null,
      },
      now,
    ),
    childProcess: null,
  };
}

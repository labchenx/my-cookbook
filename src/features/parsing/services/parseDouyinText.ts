import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  type DouyinCliClientOptions,
  DouyinCliClientError,
  parseDouyinTextWithCli,
} from '../providers/douyinCliClient';
import type { ParseDouyinText, ParseDouyinTextOptions } from '../types';

loadDotenv();

type ParsingEnvironment = Partial<
  Record<
    | 'API_KEY'
    | 'DOUYIN_CLI_OUTPUT_DIR'
    | 'DOUYIN_CLI_PROJECT_ROOT'
    | 'DOUYIN_CLI_PYTHON_COMMAND'
    | 'DOUYIN_CLI_TIMEOUT_MS'
    | 'DOUYIN_CLI_UV_COMMAND'
    | 'DOUYIN_MCP_PROJECT_ROOT'
    | 'FFMPEG_COMMAND',
    string
  >
>;

type ParseDouyinTextDependencies = {
  env?: ParsingEnvironment;
  parseWithProvider?: typeof parseDouyinTextWithCli;
  cwd?: string;
};

type ResolveDouyinParsingRequestDependencies = Pick<
  ParseDouyinTextDependencies,
  'env' | 'cwd'
>;

type ResolvedDouyinParsingRequest = {
  normalizedUrl: string;
  providerOptions: Omit<DouyinCliClientOptions, 'onEvent'>;
};

export class ParsingError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ParsingError';
  }
}

function getApiKey(env: ParsingEnvironment): string | null {
  const candidates = [env.API_KEY];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return null;
}

function resolveProjectRoot(env: ParsingEnvironment, cwd: string): string | null {
  const configuredRoot =
    env.DOUYIN_CLI_PROJECT_ROOT?.trim() || env.DOUYIN_MCP_PROJECT_ROOT?.trim();

  if (configuredRoot) {
    const resolvedRoot = path.resolve(configuredRoot);
    return existsSync(path.join(resolvedRoot, 'douyin-video', 'scripts', 'douyin_downloader.py'))
      ? resolvedRoot
      : null;
  }

  const candidates = [
    path.join(os.homedir(), 'Desktop', 'douyin-mcp-server'),
    path.resolve(cwd, '..', 'douyin-mcp-server'),
    path.resolve(cwd, 'douyin-mcp-server'),
  ];

  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, 'douyin-video', 'scripts', 'douyin_downloader.py'))) {
      return candidate;
    }
  }

  return null;
}

function parseTimeout(timeoutValue: string | undefined): number | undefined {
  const parsedTimeout = Number(timeoutValue);

  return Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : undefined;
}

function resolveUvCommand(env: ParsingEnvironment): string | undefined {
  const configuredCommand = env.DOUYIN_CLI_UV_COMMAND?.trim();

  if (configuredCommand) {
    return configuredCommand;
  }

  const executableName = process.platform === 'win32' ? 'uv.exe' : 'uv';
  const candidates = [
    path.join(os.homedir(), '.local', 'bin', executableName),
    path.join(os.homedir(), '.cargo', 'bin', executableName),
    path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'uv', executableName),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

export const parseDouyinText: ParseDouyinText = async (url, options) => {
  return createParseDouyinText()(url, options);
};

export function resolveDouyinParsingRequest(
  url: string,
  dependencies: ResolveDouyinParsingRequestDependencies = {},
): ResolvedDouyinParsingRequest {
  const env = dependencies.env ?? process.env;
  const cwd = dependencies.cwd ?? process.cwd();

  if (typeof url !== 'string') {
    throw new ParsingError('Invalid parsing request.', 400);
  }

  const normalizedUrl = url.trim();

  if (!normalizedUrl) {
    throw new ParsingError('Douyin url is required.', 400);
  }

  const apiKey = getApiKey(env);

  if (!apiKey) {
    throw new ParsingError(
      'Douyin parser requires API_KEY for the SiliconFlow CLI script.',
      500,
    );
  }

  const projectRoot = resolveProjectRoot(env, cwd);

  if (!projectRoot) {
    throw new ParsingError(
      'Douyin CLI project root is not configured. Set DOUYIN_CLI_PROJECT_ROOT to the douyin-mcp-server repo.',
      500,
    );
  }

  return {
    normalizedUrl,
    providerOptions: {
      apiKey,
      projectRoot,
      outputDir: path.resolve(env.DOUYIN_CLI_OUTPUT_DIR?.trim() || path.join(cwd, '.douyin-output')),
      uvCommand: resolveUvCommand(env),
      pythonCommand: env.DOUYIN_CLI_PYTHON_COMMAND?.trim() || undefined,
      timeoutMs: parseTimeout(env.DOUYIN_CLI_TIMEOUT_MS),
      ffmpegCommand: env.FFMPEG_COMMAND?.trim() || undefined,
    },
  };
}

export function createParseDouyinText(
  dependencies: ParseDouyinTextDependencies = {},
): ParseDouyinText {
  const parseWithProvider = dependencies.parseWithProvider ?? parseDouyinTextWithCli;

  return async (url: string, options?: ParseDouyinTextOptions) => {
    const { normalizedUrl, providerOptions } = resolveDouyinParsingRequest(url, dependencies);

    try {
      return await parseWithProvider(
        normalizedUrl,
        options?.onEvent ? { ...providerOptions, onEvent: options.onEvent } : providerOptions,
      );
    } catch (error) {
      if (error instanceof DouyinCliClientError) {
        switch (error.code) {
          case 'startup':
            throw new ParsingError(error.message || 'Failed to start the Douyin parser.', 500, error);
          case 'timeout':
            throw new ParsingError(
              error.message || 'Douyin parsing timed out. Please try again.',
              504,
              error,
            );
          case 'invalid-result':
            throw new ParsingError(
              error.message || 'Douyin parser returned an invalid result.',
              502,
              error,
            );
          case 'tool':
            throw new ParsingError(error.message || 'Failed to parse Douyin content.', 502, error);
        }
      }

      throw new ParsingError(
        error instanceof Error && error.message ? error.message : 'Failed to parse Douyin content.',
        500,
        error,
      );
    }
  };
}

import {
  ensureXhsDownloaderDevService,
  normalizeXhsDownloaderApiBaseUrl,
  resolveUvExecutable,
} from './xhsDownloaderDev';

describe('normalizeXhsDownloaderApiBaseUrl', () => {
  it('normalizes trailing slashes', () => {
    expect(
      normalizeXhsDownloaderApiBaseUrl({
        XHS_DOWNLOADER_API_BASE_URL: 'http://127.0.0.1:5556/',
      }),
    ).toBe('http://127.0.0.1:5556');
  });
});

describe('resolveUvExecutable', () => {
  it('prefers a uv executable from PATH', () => {
    expect(
      resolveUvExecutable(
        {
          PATH: 'C:\\tools;C:\\python',
          PATHEXT: '.EXE;.CMD',
        },
        (candidate) => candidate === 'C:\\tools\\uv.exe',
      ),
    ).toBe('C:\\tools\\uv.exe');
  });
});

describe('ensureXhsDownloaderDevService', () => {
  it('reuses an already running service instead of spawning a new one', async () => {
    const result = await ensureXhsDownloaderDevService({
      env: {
        XHS_DOWNLOADER_API_BASE_URL: 'http://127.0.0.1:5556',
      },
      fetcher: vi.fn().mockResolvedValue({ ok: true }),
      spawnProcess: vi.fn(),
      now: () => '2026-04-23T00:00:00.000Z',
    });

    expect(result.status).toEqual(
      expect.objectContaining({
        available: true,
        source: 'existing',
        code: 'existing_service',
      }),
    );
    expect(result.childProcess).toBeNull();
  });

  it('returns a non-blocking status when project root is missing', async () => {
    const result = await ensureXhsDownloaderDevService({
      env: {
        XHS_DOWNLOADER_API_BASE_URL: 'http://127.0.0.1:5556',
      },
      fetcher: vi.fn().mockResolvedValue({ ok: false }),
      now: () => '2026-04-23T00:00:00.000Z',
    });

    expect(result.status).toEqual(
      expect.objectContaining({
        available: false,
        source: 'unavailable',
        code: 'missing_project_root',
      }),
    );
    expect(result.childProcess).toBeNull();
  });

  it('starts the downloader when the service is unavailable and the project root exists', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true });
    const childProcess = {
      pid: 4321,
      exitCode: null,
      kill: vi.fn().mockReturnValue(true),
      once: vi.fn(),
    };
    const spawnProcess = vi.fn().mockReturnValue(childProcess);

    const result = await ensureXhsDownloaderDevService({
      env: {
        PATH: 'C:\\tools',
        PATHEXT: '.EXE',
        XHS_DOWNLOADER_API_BASE_URL: 'http://127.0.0.1:5556',
        XHS_DOWNLOADER_PROJECT_ROOT: 'D:/external/XHS-Downloader',
      },
      cwd: 'D:/codex_code/my_cookbook',
      fetcher,
      pathExists: (targetPath) =>
        targetPath === 'D:\\external\\XHS-Downloader' || targetPath === 'C:\\tools\\uv.exe',
      spawnProcess,
      sleep: vi.fn().mockResolvedValue(undefined),
      healthCheckAttempts: 3,
      healthCheckIntervalMs: 1,
      now: () => '2026-04-23T00:00:00.000Z',
    });

    expect(spawnProcess).toHaveBeenCalledWith(
      'C:\\tools\\uv.exe',
      ['run', 'main.py', 'api'],
      expect.objectContaining({
        cwd: 'D:\\external\\XHS-Downloader',
        shell: false,
        stdio: 'inherit',
      }),
    );
    expect(result.status).toEqual(
      expect.objectContaining({
        available: true,
        source: 'managed',
        code: 'managed_service',
        managedProcessId: 4321,
      }),
    );
    expect(result.childProcess).toBe(childProcess);
  });
});

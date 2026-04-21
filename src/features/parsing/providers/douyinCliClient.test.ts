import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import path from 'node:path';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import {
  DouyinCliClientError,
  extractTranscriptText,
  inferCliParsingStage,
  parseDouyinTextWithCli,
} from './douyinCliClient';

function createChildProcessMock() {
  const child = new EventEmitter() as ChildProcessWithoutNullStreams;
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.kill = vi.fn(() => true) as ChildProcessWithoutNullStreams['kill'];

  return child;
}

describe('parseDouyinTextWithCli', () => {
  it('runs the SiliconFlow CLI script and returns transcript text', async () => {
    const child = createChildProcessMock();
    const spawn = vi.fn(() => child);
    const onEvent = vi.fn();
    const runtime = {
      spawn,
      mkdir: vi.fn().mockResolvedValue(undefined),
      readFile: vi.fn().mockResolvedValue('# 标题\n\n## 文案内容\n\n番茄炒蛋做法'),
      findLatestTranscript: vi.fn().mockResolvedValue('D:/output/run/video/transcript.md'),
      createRunId: () => 'run-1',
    };

    const parsePromise = parseDouyinTextWithCli(
      'https://v.douyin.com/example/',
      {
        apiKey: 'siliconflow-key',
        projectRoot: 'C:/Users/CHEN/Desktop/douyin-mcp-server',
        outputDir: 'D:/codex_code/my_cookbook/.douyin-output',
        uvCommand: 'uv',
        pythonCommand: 'python',
        ffmpegCommand: 'C:/Tools/ffmpeg/bin/ffmpeg.exe',
        onEvent,
      },
      runtime,
    );

    await Promise.resolve();
    (child.stdout as PassThrough).write('正在解析抖音分享链接...\n');
    (child.stdout as PassThrough).write('下载进度: 100.0%\n');
    (child.stdout as PassThrough).write('正在识别第 2/4 段...\n');
    child.emit('close', 0);

    await expect(parsePromise).resolves.toBe('番茄炒蛋做法');
    expect(spawn).toHaveBeenCalledWith(
      'uv',
      [
        'run',
        'python',
        'douyin-video\\scripts\\douyin_downloader.py',
        '-l',
        'https://v.douyin.com/example/',
        '-a',
        'extract',
        '-o',
        'D:\\codex_code\\my_cookbook\\.douyin-output\\run-1',
      ],
      expect.objectContaining({
        cwd: 'C:/Users/CHEN/Desktop/douyin-mcp-server',
        env: expect.objectContaining({
          API_KEY: 'siliconflow-key',
          FFMPEG_COMMAND: 'C:/Tools/ffmpeg/bin/ffmpeg.exe',
          PYTHONIOENCODING: 'utf-8',
        }),
      }),
    );
    const spawnCall = spawn.mock.calls[0] as unknown as [
      string,
      string[],
      { env: NodeJS.ProcessEnv },
    ];
    const spawnEnvironment = spawnCall[2].env;
    const pathKey = Object.keys(spawnEnvironment).find((key) => key.toLowerCase() === 'path') ?? 'PATH';

    expect(spawnEnvironment[pathKey]?.split(path.delimiter)).toContain('C:/Tools/ffmpeg/bin');
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ stage: 'parse_link' }));
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ stage: 'fetch_media' }));
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ stage: 'transcribe' }));
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ stage: 'completed' }));
  });

  it('throws a stable tool error when the CLI exits unsuccessfully', async () => {
    const child = createChildProcessMock();
    const runtime = {
      spawn: vi.fn(() => child),
      mkdir: vi.fn().mockResolvedValue(undefined),
      readFile: vi.fn(),
      findLatestTranscript: vi.fn(),
      createRunId: () => 'run-1',
    };

    const parsePromise = parseDouyinTextWithCli(
      'https://v.douyin.com/example/',
      {
        apiKey: 'siliconflow-key',
        projectRoot: 'C:/Users/CHEN/Desktop/douyin-mcp-server',
        outputDir: 'D:/codex_code/my_cookbook/.douyin-output',
      },
      runtime,
    );

    await Promise.resolve();
    (child.stderr as PassThrough).write('API 调用失败\n');
    child.emit('close', 1);

    await expect(parsePromise).rejects.toMatchObject({
      name: 'DouyinCliClientError',
      code: 'tool',
      message: 'API 调用失败',
    });
  });

  it('does not emit completed when a sub-step says completed before the CLI fails', async () => {
    const child = createChildProcessMock();
    const onEvent = vi.fn();
    const runtime = {
      spawn: vi.fn(() => child),
      mkdir: vi.fn().mockResolvedValue(undefined),
      readFile: vi.fn(),
      findLatestTranscript: vi.fn(),
      createRunId: () => 'run-1',
    };

    const parsePromise = parseDouyinTextWithCli(
      'https://v.douyin.com/example/',
      {
        apiKey: 'siliconflow-key',
        projectRoot: 'C:/Users/CHEN/Desktop/douyin-mcp-server',
        outputDir: 'D:/codex_code/my_cookbook/.douyin-output',
        onEvent,
      },
      runtime,
    );

    await Promise.resolve();
    (child.stdout as PassThrough).write('音频提取完成\n');
    (child.stderr as PassThrough).write('读取音频失败\n');
    child.emit('close', 1);

    await expect(parsePromise).rejects.toMatchObject({
      code: 'tool',
      message: '读取音频失败',
    });
    expect(onEvent).not.toHaveBeenCalledWith(expect.objectContaining({ stage: 'completed' }));
  });

  it('throws an invalid result error when transcript.md is missing', async () => {
    const child = createChildProcessMock();
    const runtime = {
      spawn: vi.fn(() => child),
      mkdir: vi.fn().mockResolvedValue(undefined),
      readFile: vi.fn(),
      findLatestTranscript: vi.fn().mockResolvedValue(null),
      createRunId: () => 'run-1',
    };

    const parsePromise = parseDouyinTextWithCli(
      'https://v.douyin.com/example/',
      {
        apiKey: 'siliconflow-key',
        projectRoot: 'C:/Users/CHEN/Desktop/douyin-mcp-server',
        outputDir: 'D:/codex_code/my_cookbook/.douyin-output',
      },
      runtime,
    );

    await Promise.resolve();
    child.emit('close', 0);

    await expect(parsePromise).rejects.toBeInstanceOf(DouyinCliClientError);
    await expect(parsePromise).rejects.toMatchObject({
      code: 'invalid-result',
    });
  });
});

describe('inferCliParsingStage', () => {
  it('maps CLI progress lines into pipeline stages', () => {
    expect(inferCliParsingStage('正在解析抖音分享链接...')).toMatchObject({
      stage: 'parse_link',
    });
    expect(inferCliParsingStage('下载进度: 50.0%')).toMatchObject({
      stage: 'fetch_media',
      progress: 29.5,
    });
    expect(inferCliParsingStage('正在识别第 3/5 段...')).toMatchObject({
      stage: 'transcribe',
    });
    expect(inferCliParsingStage('文案已保存到: output/123/transcript.md')).toMatchObject({
      stage: 'write_markdown',
    });
    expect(inferCliParsingStage('音频提取完成')).toBeNull();
  });
});

describe('extractTranscriptText', () => {
  it('keeps the raw transcript content for the current public API', () => {
    expect(extractTranscriptText('# 标题\n\n## 文案内容\n\n文本内容')).toBe('文本内容');
  });
});

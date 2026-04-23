import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type {
  ParseDouyinTextOptions,
  ParsingProgressEvent,
  ParsingStage,
  ParsingStageEvent,
} from '../types';

export type DouyinCliClientOptions = {
  apiKey: string;
  projectRoot: string;
  outputDir: string;
  uvCommand?: string;
  pythonCommand?: string;
  timeoutMs?: number;
  ffmpegCommand?: string;
  onEvent?: ParseDouyinTextOptions['onEvent'];
};

type SpawnOptions = {
  cwd: string;
  env: NodeJS.ProcessEnv;
};

type DouyinCliClientRuntime = {
  spawn: (
    command: string,
    args: string[],
    options: SpawnOptions,
  ) => ChildProcessWithoutNullStreams;
  mkdir: typeof mkdir;
  readFile: typeof readFile;
  findLatestTranscript: (dir: string) => Promise<string | null>;
  createRunId: () => string;
};

type StageMapping = {
  stage: ParsingStage;
  message: string;
  progress: number;
};

const downloaderScript = path.join('douyin-video', 'scripts', 'douyin_downloader.py');

const stageMessages: Record<Exclude<ParsingStage, 'failed'>, string> = {
  parse_link: '正在解析抖音分享链接...',
  fetch_media: '正在下载视频...',
  extract_audio: '正在提取音频...',
  transcribe: '正在识别语音文案...',
  structure: '正在整理结构化结果...',
  write_markdown: '正在生成 Markdown 文件...',
  completed: '解析完成，结果已输出到控制台。',
};

export class DouyinCliClientError extends Error {
  constructor(
    message: string,
    readonly code: 'startup' | 'timeout' | 'tool' | 'invalid-result',
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'DouyinCliClientError';
  }
}

function createDouyinCliRuntime(): DouyinCliClientRuntime {
  return {
    spawn,
    mkdir,
    readFile,
    findLatestTranscript,
    createRunId: () => randomUUID(),
  };
}

function clampProgress(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function emitStage(
  event: ParseDouyinTextOptions['onEvent'],
  stage: ParsingStage,
  message: string,
  progress: number,
): void {
  if (!event) {
    return;
  }

  const payload: ParsingStageEvent = {
    type: 'stage',
    stage,
    message,
    progress: clampProgress(progress),
    createdAt: new Date().toISOString(),
  };

  event(payload);
}

function emitProgress(
  event: ParseDouyinTextOptions['onEvent'],
  stage: ParsingStage,
  message: string,
  progress: number,
): void {
  if (!event) {
    return;
  }

  const payload: ParsingProgressEvent = {
    type: 'progress',
    stage,
    message,
    progress: clampProgress(progress),
    createdAt: new Date().toISOString(),
  };

  event(payload);
}

function buildProcessEnvironment(options: DouyinCliClientOptions): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    API_KEY: options.apiKey,
    PYTHONIOENCODING: 'utf-8',
    PYTHONUTF8: '1',
  };

  if (options.ffmpegCommand) {
    const pathKey = Object.keys(env).find((key) => key.toLowerCase() === 'path') ?? 'PATH';
    const currentPath = env[pathKey] ?? '';
    const ffmpegDirectory = path.dirname(options.ffmpegCommand);

    env.FFMPEG_COMMAND = options.ffmpegCommand;
    env[pathKey] = currentPath
      ? `${ffmpegDirectory}${path.delimiter}${currentPath}`
      : ffmpegDirectory;
  }

  return env;
}

function decodeChunk(chunk: Buffer | string): string {
  return Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk;
}

function extractDownloadProgress(message: string): number | null {
  const match = message.match(/(?:download progress|下载进度)\D*(\d+(?:\.\d+)?)%/i);

  if (!match) {
    return null;
  }

  return 10 + Number(match[1]) * 0.4;
}

export function inferCliParsingStage(message: string): StageMapping | null {
  const normalizedMessage = message.trim();

  if (!normalizedMessage) {
    return null;
  }

  const downloadProgress = extractDownloadProgress(normalizedMessage);

  if (downloadProgress !== null) {
    return {
      stage: 'fetch_media',
      message: stageMessages.fetch_media,
      progress: downloadProgress,
    };
  }

  const segmentMatch = normalizedMessage.match(/(?:第|segment)\s*(\d+)\s*[/／]\s*(\d+)/i);

  if (segmentMatch) {
    const current = Number(segmentMatch[1]);
    const total = Number(segmentMatch[2]);
    const segmentProgress = total > 0 ? 58 + (current / total) * 18 : 68;

    return {
      stage: 'transcribe',
      message: `正在分段识别语音文案（${current}/${total}）...`,
      progress: segmentProgress,
    };
  }

  if (/解析.*抖音|parse.*douyin|share link/i.test(normalizedMessage)) {
    return {
      stage: 'parse_link',
      message: stageMessages.parse_link,
      progress: 6,
    };
  }

  if (/下载.*视频|download.*video/i.test(normalizedMessage)) {
    return {
      stage: 'fetch_media',
      message: stageMessages.fetch_media,
      progress: 18,
    };
  }

  if (/提取.*音频|extract.*audio/i.test(normalizedMessage)) {
    return {
      stage: 'extract_audio',
      message: stageMessages.extract_audio,
      progress: 54,
    };
  }

  if (/识别.*语音|从音频.*文本|分段|transcrib|recogniz|segment/i.test(normalizedMessage)) {
    return {
      stage: 'transcribe',
      message: stageMessages.transcribe,
      progress: 62,
    };
  }

  if (/markdown|transcript\.md|保存.*文案|output_path/i.test(normalizedMessage)) {
    return {
      stage: 'write_markdown',
      message: stageMessages.write_markdown,
      progress: 78,
    };
  }

  return null;
}

export function extractTranscriptText(markdown: string): string {
  const markers = ['## 文案内容'];

  for (const marker of markers) {
    const markerIndex = markdown.indexOf(marker);

    if (markerIndex >= 0) {
      return markdown.slice(markerIndex + marker.length).trim();
    }
  }

  return markdown.trim();
}

async function findLatestTranscript(dir: string): Promise<string | null> {
  if (!existsSync(dir)) {
    return null;
  }

  const entries = await readdir(dir, { withFileTypes: true });
  const candidates: { filePath: string; mtimeMs: number }[] = [];

  for (const entry of entries) {
    const filePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const nestedTranscript = await findLatestTranscript(filePath);

      if (nestedTranscript) {
        const nestedStat = await stat(nestedTranscript);
        candidates.push({ filePath: nestedTranscript, mtimeMs: nestedStat.mtimeMs });
      }
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase() === 'transcript.md') {
      const fileStat = await stat(filePath);
      candidates.push({ filePath, mtimeMs: fileStat.mtimeMs });
    }
  }

  candidates.sort((left, right) => right.mtimeMs - left.mtimeMs);

  return candidates[0]?.filePath ?? null;
}

function readLastUsefulLine(output: string): string {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !inferCliParsingStage(line))
    .filter((line) => !/完成|completed|success/i.test(line));

  return lines[lines.length - 1] || '';
}

function hasMojibake(message: string): boolean {
  return /[�锟姝鍒鎻鏂淇杈璇閾涓宸瀹銆€鐠閸闁娴绮鑾缁鐢]/.test(message);
}

function summarizeCliFailure(stderrOutput: string, stdoutOutput: string): string {
  const stderrMessage = readLastUsefulLine(stderrOutput);

  if (stderrMessage && !hasMojibake(stderrMessage)) {
    return stderrMessage;
  }

  const stdoutMessage = readLastUsefulLine(stdoutOutput);

  if (stdoutMessage && !hasMojibake(stdoutMessage)) {
    return stdoutMessage;
  }

  return '抖音脚本解析失败，请检查 API_KEY、网络、FFmpeg 或分享链接后重试。';
}

export async function parseDouyinTextWithCli(
  url: string,
  options: DouyinCliClientOptions,
  runtime: DouyinCliClientRuntime = createDouyinCliRuntime(),
): Promise<string> {
  const runOutputDir = path.join(options.outputDir, runtime.createRunId());
  const uvCommand = options.uvCommand?.trim() || 'uv';
  const pythonCommand = options.pythonCommand?.trim() || 'python';
  const args = [
    'run',
    pythonCommand,
    downloaderScript,
    '-l',
    url,
    '-a',
    'extract',
    '-o',
    runOutputDir,
  ];

  await runtime.mkdir(runOutputDir, { recursive: true });

  emitStage(options.onEvent, 'parse_link', stageMessages.parse_link, 6);

  const child = runtime.spawn(uvCommand, args, {
    cwd: options.projectRoot,
    env: buildProcessEnvironment(options),
  });

  let stdoutOutput = '';
  let stderrOutput = '';
  let currentStage: ParsingStage = 'parse_link';
  let currentMessage = stageMessages.parse_link;

  const handleOutput = (chunk: Buffer | string, target: 'stdout' | 'stderr') => {
    const output = decodeChunk(chunk);

    if (target === 'stdout') {
      stdoutOutput += output;
    } else {
      stderrOutput += output;
    }

    for (const line of output.split(/\r?\n/)) {
      const mappedStage = inferCliParsingStage(line);

      if (!mappedStage) {
        continue;
      }

      currentStage = mappedStage.stage;
      currentMessage = mappedStage.message;
      emitProgress(options.onEvent, mappedStage.stage, mappedStage.message, mappedStage.progress);
    }
  };

  const timeoutMs = options.timeoutMs ?? 20 * 60 * 1000;

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill();
      reject(new DouyinCliClientError('Douyin parsing timed out. Please try again.', 'timeout'));
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => handleOutput(chunk, 'stdout'));
    child.stderr.on('data', (chunk: Buffer) => handleOutput(chunk, 'stderr'));
    child.on('error', (error) => {
      clearTimeout(timeout);
      const message =
        (error as NodeJS.ErrnoException).code === 'ENOENT'
          ? `Douyin CLI dependency was not found: ${uvCommand}. Please install uv or set DOUYIN_CLI_UV_COMMAND to uv.exe.`
          : error.message || 'Failed to start the Douyin CLI parser.';

      reject(new DouyinCliClientError(message, 'startup', error));
    });
    child.on('close', (code) => {
      clearTimeout(timeout);

      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new DouyinCliClientError(
          summarizeCliFailure(stderrOutput, stdoutOutput),
          code === null ? 'startup' : 'tool',
        ),
      );
    });
  });

  emitProgress(options.onEvent, currentStage, currentMessage, 76);
  emitStage(options.onEvent, 'write_markdown', stageMessages.write_markdown, 78);

  const transcriptPath = await runtime.findLatestTranscript(runOutputDir);

  if (!transcriptPath) {
    throw new DouyinCliClientError('Douyin CLI did not generate transcript.md.', 'invalid-result');
  }

  const transcriptMarkdown = await runtime.readFile(transcriptPath, 'utf8');
  const text = extractTranscriptText(transcriptMarkdown);

  if (!text) {
    throw new DouyinCliClientError('Douyin CLI generated an empty transcript.', 'invalid-result');
  }

  return text;
}

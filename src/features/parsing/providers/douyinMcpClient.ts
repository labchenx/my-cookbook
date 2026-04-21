import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import {
  LoggingMessageNotificationSchema,
  ProgressNotificationSchema,
  type LoggingMessageNotification,
  type ProgressNotification,
} from '@modelcontextprotocol/sdk/types.js';
import type {
  ParseDouyinTextOptions,
  ParsingProgressEvent,
  ParsingStage,
  ParsingStageEvent,
} from '../types';

export type DouyinMcpClientOptions = {
  apiKey: string;
  stdioCommand: string;
  cwd?: string;
  ffmpegCommand?: string;
  timeoutMs?: number;
  maxRetries?: number;
  onEvent?: ParseDouyinTextOptions['onEvent'];
};

type ToolContentBlock = {
  type?: string;
  text?: string;
};

type ProgressToken = string | number;

type DouyinMcpClientLike = {
  onerror?: ((error: Error) => void) | undefined;
  close: () => Promise<void>;
  connect: (transport: StdioClientTransport) => Promise<void>;
  callTool: Client['callTool'];
  setLoggingLevel?: Client['setLoggingLevel'];
  setNotificationHandler: Client['setNotificationHandler'];
};

type DouyinMcpClientRuntime = {
  createClient: () => DouyinMcpClientLike;
  createTransport: (options: ConstructorParameters<typeof StdioClientTransport>[0]) => StdioClientTransport;
  createProgressToken: () => ProgressToken;
};

type StageMapping = {
  stage: ParsingStage;
  progress?: number;
  message: string;
};

const stageProgressDefaults: Record<Exclude<ParsingStage, 'failed'>, number> = {
  parse_link: 8,
  fetch_media: 34,
  extract_audio: 56,
  transcribe: 82,
  structure: 92,
  write_markdown: 97,
  completed: 100,
};

const stageMessages: Record<Exclude<ParsingStage, 'failed'>, string> = {
  parse_link: '正在解析抖音分享链接...',
  fetch_media: '正在获取视频内容...',
  extract_audio: '正在提取音频...',
  transcribe: '正在识别视频文案...',
  structure: '正在整理结构化结果...',
  write_markdown: '正在生成 Markdown...',
  completed: '解析完成，结果已准备好。',
};

export class DouyinMcpClientError extends Error {
  constructor(
    message: string,
    readonly code: 'startup' | 'timeout' | 'tool' | 'invalid-result',
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'DouyinMcpClientError';
  }
}

export function parseCommandString(commandString: string): { command: string; args: string[] } {
  const parts: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;

  for (const character of commandString.trim()) {
    if ((character === '"' || character === "'") && !quote) {
      quote = character;
      continue;
    }

    if (character === quote) {
      quote = null;
      continue;
    }

    if (/\s/.test(character) && !quote) {
      if (current) {
        parts.push(current);
        current = '';
      }
      continue;
    }

    current += character;
  }

  if (quote) {
    throw new DouyinMcpClientError('The MCP stdio command has an unmatched quote.', 'startup');
  }

  if (current) {
    parts.push(current);
  }

  const [command, ...args] = parts;

  if (!command) {
    throw new DouyinMcpClientError('The MCP stdio command is empty.', 'startup');
  }

  return { command, args };
}

export function inferParsingStage(message: string): StageMapping | null {
  const normalizedMessage = message.trim();

  if (!normalizedMessage) {
    return null;
  }

  if (/解析.*抖音|share link|parse.*douyin/i.test(normalizedMessage)) {
    return {
      stage: 'parse_link',
      progress: stageProgressDefaults.parse_link,
      message: normalizedMessage,
    };
  }

  if (/下载.*视频|获取.*视频|download.*video|fetch.*video/i.test(normalizedMessage)) {
    return {
      stage: 'fetch_media',
      progress: stageProgressDefaults.fetch_media,
      message: normalizedMessage,
    };
  }

  if (/提取.*音频|extract.*audio/i.test(normalizedMessage)) {
    return {
      stage: 'extract_audio',
      progress: stageProgressDefaults.extract_audio,
      message: normalizedMessage,
    };
  }

  if (/识别.*语音|提取.*文本|transcrib|recogniz|from video/i.test(normalizedMessage)) {
    return {
      stage: 'transcribe',
      progress: stageProgressDefaults.transcribe,
      message: normalizedMessage,
    };
  }

  if (/结构化|structure/i.test(normalizedMessage)) {
    return {
      stage: 'structure',
      progress: stageProgressDefaults.structure,
      message: normalizedMessage,
    };
  }

  if (/markdown|md\b|transcript/i.test(normalizedMessage)) {
    return {
      stage: 'write_markdown',
      progress: stageProgressDefaults.write_markdown,
      message: normalizedMessage,
    };
  }

  if (/完成|done|completed|success/i.test(normalizedMessage)) {
    return {
      stage: 'completed',
      progress: stageProgressDefaults.completed,
      message: normalizedMessage,
    };
  }

  return null;
}

function createDouyinMcpRuntime(): DouyinMcpClientRuntime {
  return {
    createClient: () =>
      new Client({
        name: 'my-cookbook',
        version: '0.0.0',
      }),
    createTransport: (transportOptions) => new StdioClientTransport(transportOptions),
    createProgressToken: () => `douyin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
}

function readTextBlocks(content: unknown): string {
  if (!Array.isArray(content)) {
    return '';
  }

  return content
    .flatMap((item) => {
      const block = item as ToolContentBlock;
      return block?.type === 'text' && typeof block.text === 'string' ? [block.text.trim()] : [];
    })
    .filter((text) => text.length > 0)
    .join('\n');
}

function buildProcessEnvironment(options: DouyinMcpClientOptions): Record<string, string> {
  const env: Record<string, string> = {
    ...Object.entries(process.env).reduce<Record<string, string>>((result, [key, value]) => {
      if (typeof value === 'string') {
        result[key] = value;
      }
      return result;
    }, {}),
    API_KEY: options.apiKey,
    DASHSCOPE_API_KEY: options.apiKey,
    ALIYUN_BAILIAN_API_KEY: options.apiKey,
  };

  if (options.ffmpegCommand) {
    env.FFMPEG_COMMAND = options.ffmpegCommand;
  }

  return env;
}

function isTransientNetworkAbort(message: string): boolean {
  return /(connection aborted|connection reset|econnreset|10053|10054|unexpected eof while reading|ssleoferror)/i.test(
    message,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clampProgress(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeProgressValue(progress: number, total?: number): number {
  if (Number.isFinite(total) && typeof total === 'number' && total > 0) {
    return clampProgress((progress / total) * 100);
  }

  if (progress >= 0 && progress <= 1) {
    return clampProgress(progress * 100);
  }

  return clampProgress(progress);
}

function emitStage(
  event: ParseDouyinTextOptions['onEvent'],
  stage: ParsingStage,
  message: string,
  progress?: number,
): void {
  if (!event) {
    return;
  }

  const payload: ParsingStageEvent = {
    type: 'stage',
    stage,
    message,
    createdAt: new Date().toISOString(),
  };

  if (typeof progress === 'number') {
    payload.progress = clampProgress(progress);
  }

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

function readLogMessage(data: unknown): string {
  if (typeof data === 'string') {
    return data.trim();
  }

  if (!data || typeof data !== 'object') {
    return '';
  }

  const candidates = ['message', 'text', 'detail'] as const;

  for (const key of candidates) {
    const value = (data as Record<string, unknown>)[key];

    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  try {
    return JSON.stringify(data);
  } catch {
    return '';
  }
}

export async function parseDouyinTextWithMcp(
  url: string,
  options: DouyinMcpClientOptions,
  runtime: DouyinMcpClientRuntime = createDouyinMcpRuntime(),
): Promise<string> {
  const { command, args } = parseCommandString(options.stdioCommand);
  const maxAttempts = Math.max(1, (options.maxRetries ?? 2) + 1);
  let lastError: DouyinMcpClientError | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const client = runtime.createClient();
    const transport = runtime.createTransport({
      command,
      args,
      cwd: options.cwd,
      env: buildProcessEnvironment(options),
      stderr: 'pipe',
    });
    const progressToken = runtime.createProgressToken();
    let stderrOutput = '';
    let currentStage: ParsingStage = 'parse_link';
    let currentStageMessage = stageMessages.parse_link;

    transport.stderr?.on('data', (chunk) => {
      stderrOutput += String(chunk);
    });

    client.onerror = (error) => {
      if (!stderrOutput && error.message) {
        stderrOutput = error.message;
      }
    };

    client.setNotificationHandler(LoggingMessageNotificationSchema, (notification) => {
      const payload = notification as LoggingMessageNotification;
      const metaProgressToken = payload.params._meta?.progressToken;

      if (metaProgressToken !== undefined && metaProgressToken !== progressToken) {
        return;
      }

      const message = readLogMessage(payload.params.data);
      const mappedStage = inferParsingStage(message);

      if (!mappedStage) {
        return;
      }

      currentStage = mappedStage.stage;
      currentStageMessage = mappedStage.message;
      emitStage(options.onEvent, mappedStage.stage, mappedStage.message, mappedStage.progress);
    });

    client.setNotificationHandler(ProgressNotificationSchema, (notification) => {
      const payload = notification as ProgressNotification;

      if (payload.params.progressToken !== progressToken) {
        return;
      }

      const progress = normalizeProgressValue(payload.params.progress, payload.params.total);
      const message =
        payload.params.message?.trim() ||
        currentStageMessage ||
        (currentStage === 'failed' ? 'Parsing failed.' : stageMessages[currentStage]);

      emitProgress(options.onEvent, currentStage, message, progress);
    });

    try {
      await client.connect(transport);
      await client.setLoggingLevel?.('info').catch(() => undefined);
    } catch (error) {
      throw new DouyinMcpClientError(
        stderrOutput.trim() || 'Failed to start the Douyin MCP server.',
        'startup',
        error,
      );
    }

    try {
      emitStage(options.onEvent, 'parse_link', stageMessages.parse_link, stageProgressDefaults.parse_link);

      const result = await client.callTool(
        {
          name: 'extract_douyin_text',
          arguments: {
            share_link: url,
          },
          _meta: {
            progressToken,
          },
        },
        undefined,
        { timeout: options.timeoutMs ?? 180_000 },
      );

      if (result.isError) {
        throw new DouyinMcpClientError(
          readTextBlocks(result.content) || 'The Douyin MCP tool reported an error.',
          'tool',
        );
      }

      const text = readTextBlocks(result.content);

      if (!text) {
        throw new DouyinMcpClientError(
          'The Douyin MCP tool returned an empty response.',
          'invalid-result',
        );
      }

      return text;
    } catch (error) {
      const normalizedError =
        error instanceof DouyinMcpClientError
          ? error
          : new DouyinMcpClientError(
              stderrOutput.trim() ||
                (error instanceof Error ? error.message : String(error)) ||
                'Failed to parse Douyin content.',
              /timeout/i.test(error instanceof Error ? error.message : String(error))
                ? 'timeout'
                : 'tool',
              error,
            );

      const canRetry =
        normalizedError.code === 'tool' &&
        isTransientNetworkAbort(normalizedError.message) &&
        attempt < maxAttempts;

      if (!canRetry) {
        throw normalizedError;
      }

      lastError = normalizedError;
      await sleep(500 * attempt);
    } finally {
      await client.close().catch(() => undefined);
    }
  }

  throw lastError ?? new DouyinMcpClientError('Failed to parse Douyin content.', 'tool');
}

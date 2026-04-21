import {
  DouyinMcpClientError,
  inferParsingStage,
  parseCommandString,
  parseDouyinTextWithMcp,
} from './douyinMcpClient';

function createTransportMock() {
  return {
    stderr: {
      on: vi.fn(),
    },
  };
}

function createClientMock(resultText = 'parsed text') {
  const notificationHandlers = new Map<unknown, (notification: unknown) => void>();

  return {
    connect: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    setLoggingLevel: vi.fn().mockResolvedValue(undefined),
    setNotificationHandler: vi.fn((schema, handler) => {
      notificationHandlers.set(schema, handler);
    }),
    callTool: vi.fn().mockImplementation(async () => {
      for (const handler of notificationHandlers.values()) {
        handler({
          params: {
            _meta: { progressToken: 'progress-token' },
            data: '正在从视频中提取文本...',
          },
        });
        handler({
          params: {
            progressToken: 'progress-token',
            progress: 0.72,
            total: 1,
            message: '识别进行中',
          },
        });
      }

      return {
        content: [{ type: 'text', text: resultText }],
        isError: false,
      };
    }),
  };
}

describe('parseCommandString', () => {
  it('splits a plain command into command and args', () => {
    expect(parseCommandString('python -m douyin_mcp_server')).toEqual({
      command: 'python',
      args: ['-m', 'douyin_mcp_server'],
    });
  });

  it('preserves quoted windows paths', () => {
    expect(parseCommandString('"C:\\Program Files\\Python\\python.exe" -m douyin_mcp_server'))
      .toEqual({
        command: 'C:\\Program Files\\Python\\python.exe',
        args: ['-m', 'douyin_mcp_server'],
      });
  });

  it('rejects unmatched quotes', () => {
    expect(() => parseCommandString('"python -m douyin_mcp_server')).toThrowError(
      DouyinMcpClientError,
    );
  });
});

describe('inferParsingStage', () => {
  it('maps extraction messages to the transcribe stage', () => {
    expect(inferParsingStage('正在从视频中提取文本...')).toMatchObject({
      stage: 'transcribe',
      progress: 82,
    });
  });
});

describe('parseDouyinTextWithMcp', () => {
  it('attaches a progress token and emits normalized stage and progress events', async () => {
    const onEvent = vi.fn();
    const transport = createTransportMock();
    const client = createClientMock();

    await expect(
      parseDouyinTextWithMcp(
        'https://v.douyin.com/example/',
        {
          apiKey: 'dashscope-key',
          stdioCommand: 'python -m douyin_mcp_server',
          onEvent,
        },
        {
          createClient: () => client,
          createTransport: () => transport as never,
          createProgressToken: () => 'progress-token',
        },
      ),
    ).resolves.toBe('parsed text');

    expect(client.callTool).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'extract_douyin_text',
        _meta: { progressToken: 'progress-token' },
      }),
      undefined,
      expect.objectContaining({ timeout: 180000 }),
    );
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'stage',
        stage: 'parse_link',
      }),
    );
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'stage',
        stage: 'transcribe',
      }),
    );
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'progress',
        stage: 'transcribe',
        progress: 72,
      }),
    );
  });
});

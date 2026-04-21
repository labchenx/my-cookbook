import { createParsingSessionsService } from './parsingSessions';
import { ParsingError } from './parseDouyinText';

async function waitForExpectation(expectation: () => void) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      expectation();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  throw lastError;
}

describe('createParsingSessionsService', () => {
  it('creates a session and stores success events for SSE replay', async () => {
    const parseText = vi.fn(async (_url: string, options) => {
      options?.onEvent?.({
        type: 'stage',
        stage: 'transcribe',
        message: '正在识别视频文案...',
        progress: 82,
        createdAt: '2026-04-21T10:00:01.000Z',
      });

      return 'parsed text';
    });

    const service = createParsingSessionsService({
      parseText,
      env: {
        API_KEY: 'siliconflow-key',
        DOUYIN_CLI_PROJECT_ROOT: 'C:/Users/CHEN/Desktop/douyin-mcp-server',
      } as NodeJS.ProcessEnv,
      createSessionId: () => 'session-1',
      retentionMs: 1000,
    });

    const session = await service.createSession('https://v.douyin.com/example/');

    await waitForExpectation(() => {
      expect(service.getSession(session.sessionId)?.events.some((event) => event.type === 'done')).toBe(true);
    });

    const snapshot = service.getSession(session.sessionId);

    expect(snapshot).toMatchObject({
      id: 'session-1',
      status: 'completed',
      currentStage: 'completed',
    });
    expect(snapshot?.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'stage', stage: 'parse_link' }),
        expect.objectContaining({ type: 'stage', stage: 'transcribe' }),
        expect.objectContaining({ type: 'result', text: 'parsed text' }),
        expect.objectContaining({ type: 'done', status: 'completed' }),
      ]),
    );
  });

  it('replays failure events when parsing throws', async () => {
    const service = createParsingSessionsService({
      parseText: vi.fn().mockRejectedValue(new ParsingError('SSL failure', 502)),
      env: {
        API_KEY: 'siliconflow-key',
        DOUYIN_CLI_PROJECT_ROOT: 'C:/Users/CHEN/Desktop/douyin-mcp-server',
      } as NodeJS.ProcessEnv,
      createSessionId: () => 'session-2',
      retentionMs: 1000,
    });

    const session = await service.createSession('https://v.douyin.com/example/');

    await waitForExpectation(() => {
      expect(service.getSession(session.sessionId)?.status).toBe('failed');
    });

    expect(service.getSession(session.sessionId)?.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'error', message: 'SSL failure' }),
        expect.objectContaining({ type: 'done', status: 'failed' }),
      ]),
    );
  });

  it('rejects invalid urls before creating a session', async () => {
    const service = createParsingSessionsService({
      parseText: vi.fn(),
      env: {
        API_KEY: 'siliconflow-key',
        DOUYIN_CLI_PROJECT_ROOT: 'C:/Users/CHEN/Desktop/douyin-mcp-server',
      } as NodeJS.ProcessEnv,
    });

    await expect(service.createSession('   ')).rejects.toMatchObject({
      message: 'Douyin url is required.',
      statusCode: 400,
    });
  });
});

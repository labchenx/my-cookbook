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

function createStructuredRecipe(rawText = 'parsed text') {
  return {
    title: 'Parsed Recipe',
    ingredients: ['ingredient'],
    steps: ['step'],
    category: '家常菜',
    tags: ['下饭菜'],
    imagePrompt: 'Parsed Recipe cover',
    coverImageName: 'parsed-recipe.png',
    coverImage: '/assets/recipes/parsed-recipe.png',
    rawText,
  };
}

function createValidEnv() {
  return {
    API_KEY: 'siliconflow-key',
    DOUYIN_CLI_PROJECT_ROOT: 'C:/Users/CHEN/Desktop/douyin-mcp-server',
  } as NodeJS.ProcessEnv;
}

describe('createParsingSessionsService', () => {
  it('creates a session and stores success events for SSE replay', async () => {
    const parseText = vi.fn(async (_url: string, options) => {
      options?.onEvent?.({
        type: 'stage',
        stage: 'transcribe',
        message: '正在识别视频文案...',
        progress: 62,
        createdAt: '2026-04-21T10:00:01.000Z',
      });

      return 'parsed text';
    });
    const structureRecipe = vi.fn(async (_rawText: string, options) => {
      options?.onEvent?.({
        type: 'progress',
        stage: 'structure',
        message: '正在调用百炼结构化菜谱',
        progress: 80,
        createdAt: '2026-04-21T10:00:02.000Z',
      });

      return createStructuredRecipe();
    });

    const service = createParsingSessionsService({
      parseText,
      structureRecipe,
      env: createValidEnv(),
      createSessionId: () => 'session-1',
      random: () => 1,
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
        expect.objectContaining({ type: 'stage', stage: 'parse_link', progress: 6 }),
        expect.objectContaining({ type: 'stage', stage: 'transcribe', progress: 64 }),
        expect.objectContaining({ type: 'progress', stage: 'structure', progress: 82 }),
        expect.objectContaining({
          type: 'result',
          text: 'parsed text',
          recipeDraft: expect.objectContaining({ title: 'Parsed Recipe' }),
        }),
        expect.objectContaining({ type: 'done', status: 'completed' }),
      ]),
    );
    expect(structureRecipe).toHaveBeenCalledWith(
      'parsed text',
      expect.objectContaining({
        sourceType: 'douyin',
        sourceUrl: 'https://v.douyin.com/example/',
      }),
    );
  });

  it('keeps jittered progress monotonic and completes at exactly 100', async () => {
    const parseText = vi.fn(async (_url: string, options) => {
      options?.onEvent?.({
        type: 'stage',
        stage: 'fetch_media',
        message: '正在下载视频...',
        progress: 50,
        createdAt: '2026-04-21T10:00:01.000Z',
      });
      options?.onEvent?.({
        type: 'progress',
        stage: 'extract_audio',
        message: '正在提取音频...',
        progress: 54,
        createdAt: '2026-04-21T10:00:02.000Z',
      });
      options?.onEvent?.({
        type: 'progress',
        stage: 'transcribe',
        message: '正在识别语音文案...',
        progress: 62,
        createdAt: '2026-04-21T10:00:03.000Z',
      });
      options?.onEvent?.({
        type: 'stage',
        stage: 'write_markdown',
        message: '正在生成 Markdown 文件...',
        progress: 78,
        createdAt: '2026-04-21T10:00:04.000Z',
      });

      return 'parsed text';
    });
    const structureRecipe = vi.fn(async (_rawText: string, options) => {
      options?.onEvent?.({
        type: 'stage',
        stage: 'structure',
        message: '正在调用百炼结构化菜谱',
        progress: 80,
        createdAt: '2026-04-21T10:00:05.000Z',
      });
      options?.onEvent?.({
        type: 'progress',
        stage: 'structure',
        message: '正在生成菜谱封面图',
        progress: 92,
        createdAt: '2026-04-21T10:00:06.000Z',
      });

      return createStructuredRecipe();
    });
    const service = createParsingSessionsService({
      parseText,
      structureRecipe,
      env: createValidEnv(),
      createSessionId: () => 'session-progress',
      random: () => 0,
      retentionMs: 1000,
    });

    const session = await service.createSession('https://v.douyin.com/example/');

    await waitForExpectation(() => {
      expect(service.getSession(session.sessionId)?.status).toBe('completed');
    });

    const progressEvents =
      service
        .getSession(session.sessionId)
        ?.events.filter((event) => event.type === 'stage' || event.type === 'progress') ?? [];
    const progresses = progressEvents.flatMap((event) =>
      typeof event.progress === 'number' ? [event.progress] : [],
    );

    expect(progresses).toEqual([4, 48, 53, 60, 77, 79, 90, 100]);
    expect(progresses).toEqual([...progresses].sort((left, right) => left - right));
  });

  it('replays failure events when parsing throws without adding fake failure progress', async () => {
    const service = createParsingSessionsService({
      parseText: vi.fn().mockRejectedValue(new ParsingError('SSL failure', 502)),
      env: createValidEnv(),
      createSessionId: () => 'session-2',
      random: () => 1,
      retentionMs: 1000,
    });

    const session = await service.createSession('https://v.douyin.com/example/');

    await waitForExpectation(() => {
      expect(service.getSession(session.sessionId)?.status).toBe('failed');
    });

    const events = service.getSession(session.sessionId)?.events ?? [];
    const failedStageEvent = events.find(
      (event) => event.type === 'stage' && event.stage === 'failed',
    );

    expect(failedStageEvent).toEqual(expect.objectContaining({ message: 'SSL failure' }));
    expect(failedStageEvent).not.toHaveProperty('progress');
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'error', message: 'SSL failure' }),
        expect.objectContaining({ type: 'done', status: 'failed' }),
      ]),
    );
  });

  it('rejects invalid urls before creating a session', async () => {
    const service = createParsingSessionsService({
      parseText: vi.fn(),
      env: createValidEnv(),
    });

    await expect(service.createSession('   ')).rejects.toMatchObject({
      message: 'Douyin url is required.',
      statusCode: 400,
    });
  });

  it('fails the session when recipe structuring fails', async () => {
    const service = createParsingSessionsService({
      parseText: vi.fn().mockResolvedValue('parsed text'),
      structureRecipe: vi.fn().mockRejectedValue(new Error('Bailian recipe result is missing title.')),
      env: createValidEnv(),
      createSessionId: () => 'session-3',
      random: () => 0.5,
      retentionMs: 1000,
    });

    const session = await service.createSession('https://v.douyin.com/example/');

    await waitForExpectation(() => {
      expect(service.getSession(session.sessionId)?.status).toBe('failed');
    });

    expect(service.getSession(session.sessionId)?.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'error',
          message: 'Bailian recipe result is missing title.',
        }),
        expect.objectContaining({ type: 'done', status: 'failed' }),
      ]),
    );
  });
});

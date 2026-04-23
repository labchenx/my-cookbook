import { createStructureRecipe, RecipeStructuringError } from './structureRecipe';

function createJsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    headers: {
      get: () => 'application/json',
    },
  };
}

function createImageResponse(bytes = new Uint8Array([1, 2, 3])) {
  return {
    ok: true,
    status: 200,
    json: async () => ({}),
    arrayBuffer: async () => bytes.buffer,
    headers: {
      get: (name: string) => (name.toLowerCase() === 'content-type' ? 'image/png' : null),
    },
  };
}

function createTextModelBody(content: string) {
  return {
    choices: [
      {
        message: {
          content,
        },
      },
    ],
  };
}

function createImageModelBody(url = 'https://example.com/generated.png') {
  return {
    output: {
      choices: [
        {
          message: {
            content: [{ image: url }],
          },
        },
      ],
    },
  };
}

describe('createStructureRecipe', () => {
  it('structures recipe JSON and saves the generated cover image', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse(
          createTextModelBody(
            JSON.stringify({
              title: '辣椒炒肉',
              ingredients: ['前腿肉', '螺丝椒'],
              steps: ['切肉和辣椒', '煸炒肥肉', '加入瘦肉和调味料'],
              category: '家常菜',
              tags: ['下饭菜', '快手菜'],
              imagePrompt: '辣椒炒肉真实菜谱封面',
            }),
          ),
        ),
      )
      .mockResolvedValueOnce(createJsonResponse(createImageModelBody()))
      .mockResolvedValueOnce(createImageResponse());
    const writeFileMock = vi.fn().mockResolvedValue(undefined);
    const mkdirMock = vi.fn().mockResolvedValue(undefined);
    const structureRecipe = createStructureRecipe({
      env: {
        DASHSCOPE_API_KEY: 'dashscope-key',
      } as NodeJS.ProcessEnv,
      fetch: fetchMock,
      mkdir: mkdirMock,
      writeFile: writeFileMock,
      outputDirectory: 'D:/recipes',
      now: () => 1776672000000,
      createId: () => 'abc12345',
    });

    await expect(structureRecipe('raw transcript')).resolves.toEqual({
      title: '辣椒炒肉',
      ingredients: ['前腿肉', '螺丝椒'],
      steps: ['切肉和辣椒', '煸炒肥肉', '加入瘦肉和调味料'],
      category: '家常菜',
      tags: ['下饭菜', '快手菜'],
      imagePrompt: '辣椒炒肉真实菜谱封面',
      coverImageName: 'recipe-cover-1776672000000-abc12345.png',
      coverImage: '/assets/recipes/recipe-cover-1776672000000-abc12345.png',
      rawText: 'raw transcript',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer dashscope-key' }),
      }),
    );
    expect(writeFileMock).toHaveBeenCalledWith(
      expect.stringContaining('recipe-cover-1776672000000-abc12345.png'),
      expect.any(Buffer),
    );
  });

  it('parses JSON wrapped in a markdown code fence', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse(
          createTextModelBody(
            '```json\n{"title":"番茄炒蛋","ingredients":["番茄","鸡蛋"],"steps":["炒蛋","炒番茄"],"category":"家常菜","tags":["快手菜"],"imagePrompt":"番茄炒蛋封面"}\n```',
          ),
        ),
      )
      .mockResolvedValueOnce(createJsonResponse(createImageModelBody()))
      .mockResolvedValueOnce(createImageResponse());
    const structureRecipe = createStructureRecipe({
      env: { DASHSCOPE_API_KEY: 'dashscope-key' } as NodeJS.ProcessEnv,
      fetch: fetchMock,
      mkdir: vi.fn().mockResolvedValue(undefined),
      writeFile: vi.fn().mockResolvedValue(undefined),
    });

    await expect(structureRecipe('raw transcript')).resolves.toMatchObject({
      title: '番茄炒蛋',
      ingredients: ['番茄', '鸡蛋'],
      steps: ['炒蛋', '炒番茄'],
    });
  });

  it('retries transient network failures before structuring the recipe', async () => {
    const networkError = Object.assign(new TypeError('fetch failed'), {
      cause: new Error('socket disconnected'),
    });
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce(
        createJsonResponse(
          createTextModelBody(
            JSON.stringify({
              title: 'Retry Recipe',
              ingredients: ['ingredient'],
              steps: ['step'],
              category: '家常菜',
              tags: ['下饭菜'],
              imagePrompt: 'Retry Recipe cover',
            }),
          ),
        ),
      )
      .mockResolvedValueOnce(createJsonResponse(createImageModelBody()))
      .mockResolvedValueOnce(createImageResponse());
    const structureRecipe = createStructureRecipe({
      env: { DASHSCOPE_API_KEY: 'dashscope-key' } as NodeJS.ProcessEnv,
      fetch: fetchMock,
      mkdir: vi.fn().mockResolvedValue(undefined),
      writeFile: vi.fn().mockResolvedValue(undefined),
      now: () => 1776672000000,
      createId: () => 'abc12345',
    });

    await expect(structureRecipe('raw transcript')).resolves.toMatchObject({
      title: 'Retry Recipe',
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('fails when required structured fields are missing', async () => {
    const structureRecipe = createStructureRecipe({
      env: { DASHSCOPE_API_KEY: 'dashscope-key' } as NodeJS.ProcessEnv,
      fetch: vi.fn().mockResolvedValueOnce(
        createJsonResponse(createTextModelBody('{"title":"只有标题","ingredients":[],"steps":[]}')),
      ),
      mkdir: vi.fn().mockResolvedValue(undefined),
      writeFile: vi.fn().mockResolvedValue(undefined),
    });

    await expect(structureRecipe('raw transcript')).rejects.toBeInstanceOf(RecipeStructuringError);
  });

  it('keeps the structured recipe when cover generation fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse(
          createTextModelBody(
            JSON.stringify({
              title: '青椒土豆丝',
              ingredients: ['土豆', '青椒'],
              steps: ['切丝', '翻炒'],
              category: '素菜',
              tags: ['家常菜'],
              imagePrompt: '青椒土豆丝封面',
            }),
          ),
        ),
      )
      .mockResolvedValueOnce(createJsonResponse({ message: 'image failed' }, 500));
    const onEvent = vi.fn();
    const structureRecipe = createStructureRecipe({
      env: { DASHSCOPE_API_KEY: 'dashscope-key' } as NodeJS.ProcessEnv,
      fetch: fetchMock,
      mkdir: vi.fn().mockResolvedValue(undefined),
      writeFile: vi.fn().mockResolvedValue(undefined),
    });

    await expect(structureRecipe('raw transcript', { onEvent })).resolves.toMatchObject({
      title: '青椒土豆丝',
      coverImageName: null,
      coverImage: null,
    });
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'progress',
        stage: 'structure',
        message: expect.stringContaining('封面生成失败'),
      }),
    );
  });
});

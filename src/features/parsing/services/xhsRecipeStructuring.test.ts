import { createStructureXhsRecipe, XhsRecipeStructuringError } from './xhsRecipeStructuring';
import type { XhsDownloaderDetailData } from '../types';

function createBaseDetail(): XhsDownloaderDetailData {
  return {
    url: 'https://www.xiaohongshu.com/explore/abc123?xsec_token=token-123',
    upstreamBaseUrl: 'http://127.0.0.1:5556',
    status: 'ready',
    service: {
      apiBaseUrl: 'http://127.0.0.1:5556',
      available: true,
      source: 'existing',
      projectRootConfigured: true,
      projectRoot: 'D:/external/XHS-Downloader',
      message: 'Reusing the already running XHS Downloader API service.',
      updatedAt: '2026-04-28T00:00:00.000Z',
    },
    summary: {
      title: '辣椒炒肉',
      author: '厨房猫',
      contentText: '配料：前腿肉 300g，辣椒 5 根。做法：1. 切肉。2. 炒香辣椒。3. 下锅翻炒。',
      images: ['https://cdn.example.com/image-1.jpg'],
      videos: [],
      noteId: 'abc123',
      noteType: '图文',
      publishedAt: '2026-04-28_10:00:00',
    },
    raw: {
      '作品标题': '辣椒炒肉',
    },
  };
}

function createChatResponse(content: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      choices: [
        {
          message: {
            content,
          },
        },
      ],
    }),
  };
}

describe('createStructureXhsRecipe', () => {
  it('structures a recipe-like XHS detail into a project recipe payload', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      createChatResponse(
        JSON.stringify({
          isRecipe: true,
          reason: '',
          title: '辣椒炒肉',
          ingredients: ['前腿肉 300g', '辣椒 5 根'],
          steps: ['切肉', '炒香辣椒', '下锅翻炒'],
          category: '家常菜',
          tags: ['下饭菜', '家常菜', '快手菜'],
        }),
      ),
    );
    const structure = createStructureXhsRecipe({
      env: {
        DASHSCOPE_API_KEY: 'dashscope-key',
      },
      fetcher,
    });

    await expect(structure(createBaseDetail())).resolves.toMatchObject({
      ok: true,
      data: {
        model: 'qwen-vl-plus',
        recipeDraft: {
          title: '辣椒炒肉',
          ingredients: ['前腿肉 300g', '辣椒 5 根'],
          steps: ['切肉', '炒香辣椒', '下锅翻炒'],
          category: '家常菜',
          tags: ['下饭菜', '家常菜', '快手菜'],
          coverImage: null,
        },
        recipePayload: {
          title: '辣椒炒肉',
          category: '家常菜',
          tags: ['下饭菜', '家常菜', '快手菜'],
          ingredientsText: '前腿肉 300g\n辣椒 5 根',
          stepsText: '1. 切肉\n2. 炒香辣椒\n3. 下锅翻炒',
          status: 'draft',
        },
      },
    });

    expect(fetcher).toHaveBeenCalledWith(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer dashscope-key',
        }),
      }),
    );
    expect(fetcher.mock.calls[0]?.[1]?.body).toContain('"type":"image_url"');
  });

  it('falls back to the text model when there are no image urls', async () => {
    const detail = createBaseDetail();
    detail.summary.images = [];
    const fetcher = vi.fn().mockResolvedValue(
      createChatResponse(
        JSON.stringify({
          isRecipe: true,
          reason: '',
          title: '辣椒炒肉',
          ingredients: ['前腿肉 300g', '辣椒 5 根'],
          steps: ['切肉', '炒香辣椒', '下锅翻炒'],
          category: '家常菜',
          tags: ['下饭菜', '家常菜', '快手菜'],
        }),
      ),
    );
    const structure = createStructureXhsRecipe({
      env: {
        DASHSCOPE_API_KEY: 'dashscope-key',
      },
      fetcher,
    });

    await expect(structure(detail)).resolves.toMatchObject({
      data: {
        model: 'qwen-plus',
      },
    });
    expect(fetcher.mock.calls[0]?.[1]?.body).not.toContain('"type":"image_url"');
  });

  it('sends video urls to Bailian as video_url content and uses the video model', async () => {
    const detail = createBaseDetail();
    detail.summary.images = [];
    detail.summary.videos = ['http://sns-bak-v1.xhscdn.com/stream/1/110/258/demo_258.mp4'];
    const fetcher = vi.fn().mockResolvedValue(
      createChatResponse(
        JSON.stringify({
          isRecipe: true,
          reason: '',
          title: 'Braised Pork',
          ingredients: ['pork belly', 'soy sauce'],
          steps: ['cut pork', 'braise until tender'],
          category: 'Home cooking',
          tags: ['pork', 'braised'],
        }),
      ),
    );
    const structure = createStructureXhsRecipe({
      env: {
        DASHSCOPE_API_KEY: 'dashscope-key',
      },
      fetcher,
    });

    await expect(structure(detail)).resolves.toMatchObject({
      data: {
        model: 'qwen3-vl-plus',
      },
    });

    const body = fetcher.mock.calls[0]?.[1]?.body;
    expect(body).toContain('"type":"video_url"');
    expect(body).toContain('demo_258.mp4');
    expect(body).not.toContain('"type":"image_url"');
  });

  it('recovers when an old detail payload still has mp4 urls under images', async () => {
    const detail = createBaseDetail();
    detail.summary.images = ['http://sns-bak-v1.xhscdn.com/stream/1/110/258/demo_258.mp4'];
    detail.summary.videos = [];
    const fetcher = vi.fn().mockResolvedValue(
      createChatResponse(
        JSON.stringify({
          isRecipe: true,
          reason: '',
          title: 'Braised Pork',
          ingredients: ['pork belly', 'soy sauce'],
          steps: ['cut pork', 'braise until tender'],
          category: 'Home cooking',
          tags: ['pork', 'braised'],
        }),
      ),
    );
    const structure = createStructureXhsRecipe({
      env: {
        DASHSCOPE_API_KEY: 'dashscope-key',
      },
      fetcher,
    });

    await expect(structure(detail)).resolves.toMatchObject({
      data: {
        model: 'qwen3-vl-plus',
      },
    });

    const body = fetcher.mock.calls[0]?.[1]?.body;
    expect(body).toContain('"type":"video_url"');
    expect(body).not.toContain('"type":"image_url"');
  });

  it('surfaces Bailian 400 response details when available', async () => {
    const detail = createBaseDetail();
    const structure = createStructureXhsRecipe({
      env: {
        DASHSCOPE_API_KEY: 'dashscope-key',
      },
      fetcher: vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 'InvalidParameter',
            message: 'video url is inaccessible',
          },
        }),
      }),
    });

    await expect(structure(detail)).rejects.toEqual(
      new XhsRecipeStructuringError(
        'Bailian request failed with status 400: InvalidParameter: video url is inaccessible',
        502,
      ),
    );
  });

  it('falls back to text-only structuring when a multimodal request fails', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            code: 'InvalidParameter',
            message: 'image url is inaccessible',
          },
        }),
      })
      .mockResolvedValueOnce(
        createChatResponse(
          JSON.stringify({
            isRecipe: true,
            reason: '',
            title: 'Fallback noodles',
            ingredients: ['noodles', 'soy sauce'],
            steps: ['boil noodles', 'season and serve'],
            category: 'Noodles',
            tags: ['quick meal', 'noodles'],
          }),
        ),
      );
    const structure = createStructureXhsRecipe({
      env: {
        DASHSCOPE_API_KEY: 'dashscope-key',
        ALIYUN_BAILIAN_RETRY_ATTEMPTS: '1',
        ALIYUN_BAILIAN_RETRY_BASE_DELAY_MS: '1',
      },
      fetcher,
    });

    await expect(structure(createBaseDetail())).resolves.toMatchObject({
      data: {
        model: 'qwen-plus',
        recipeDraft: {
          title: 'Fallback noodles',
        },
      },
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0]?.[1]?.body).toContain('"type":"image_url"');
    expect(fetcher.mock.calls[1]?.[1]?.body).not.toContain('"type":"image_url"');
  });

  it('returns a not-recipe error when Bailian decides the post is not a recipe', async () => {
    const structure = createStructureXhsRecipe({
      env: {
        DASHSCOPE_API_KEY: 'dashscope-key',
      },
      fetcher: vi.fn().mockResolvedValue(
        createChatResponse(
          JSON.stringify({
            isRecipe: false,
            reason: '这是一篇饮食心得，不包含可复现的明确做法。',
            title: '',
            ingredients: [],
            steps: [],
            category: '',
            tags: [],
          }),
        ),
      ),
    });

    await expect(structure(createBaseDetail())).rejects.toEqual(
      new XhsRecipeStructuringError(
        '当前图文不是菜谱内容：这是一篇饮食心得，不包含可复现的明确做法。',
        422,
      ),
    );
  });

  it('surfaces a stable network error when Bailian cannot be reached', async () => {
    const structure = createStructureXhsRecipe({
      env: {
        DASHSCOPE_API_KEY: 'dashscope-key',
        ALIYUN_BAILIAN_RETRY_ATTEMPTS: '3',
        ALIYUN_BAILIAN_RETRY_BASE_DELAY_MS: '1',
      },
      fetcher: vi
        .fn()
        .mockRejectedValue(
          Object.assign(new TypeError('fetch failed'), {
            cause: { code: 'ECONNRESET', message: 'socket hang up' },
          }),
        ),
    });

    await expect(structure(createBaseDetail())).rejects.toEqual(
      new XhsRecipeStructuringError(
        'Failed to reach Bailian after 3 attempts: ECONNRESET socket hang up',
        502,
      ),
    );
  });
});

import { createParseXhsRecipe } from './parseXhsRecipe';
import type { XhsDownloaderDetailData } from '../types';

function createDetail(url: string, images: string[] = []): XhsDownloaderDetailData {
  return {
    url,
    upstreamBaseUrl: 'http://127.0.0.1:5556',
    status: 'ready',
    service: {
      apiBaseUrl: 'http://127.0.0.1:5556',
      available: true,
      source: 'existing',
      projectRootConfigured: true,
      projectRoot: 'D:/codex_code/XHS-Downloader',
      message: 'XHS Downloader API responded successfully.',
      updatedAt: null,
    },
    summary: {
      title: 'Drunken Crab',
      author: 'Kitchen',
      contentText: 'Huadiao drunken crab recipe',
      images,
      videos: [],
      noteId: 'abc',
      noteType: 'normal',
      publishedAt: null,
    },
    raw: {},
  };
}

function createStructureResponse(finalUrl: string) {
  return {
    ok: true,
    message: 'ok',
    data: {
      sourceUrl: finalUrl,
      sourceExcerpt: 'Title: Drunken Crab',
      model: 'qwen-vl-plus',
      recipeDraft: {
        title: 'Drunken Crab',
        ingredients: ['crab', 'huadiao wine'],
        steps: ['cook crab', 'marinate'],
        category: 'Seafood',
        tags: ['seafood'],
        imagePrompt: 'Realistic drunken crab cover photo',
        coverImageName: null,
        coverImage: null,
        rawText: 'Title: Drunken Crab',
      },
      recipePayload: {
        title: 'Drunken Crab',
        description: null,
        category: 'Seafood',
        tags: ['seafood'],
        ingredientsJson: null,
        ingredientsHtml: null,
        ingredientsText: 'crab\nhuadiao wine',
        stepsJson: null,
        stepsHtml: null,
        stepsText: '1. cook crab\n2. marinate',
        status: 'draft',
      },
    },
  };
}

describe('createParseXhsRecipe', () => {
  it('resolves xhslink short urls before fetching downloader detail', async () => {
    const finalUrl = 'https://www.xiaohongshu.com/explore/abc?xsec_token=token';
    const detail = createDetail(finalUrl);
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      url: finalUrl,
      json: async () => ({}),
    });
    const fetchDetail = vi.fn().mockResolvedValue({
      ok: true,
      message: 'ok',
      data: detail,
    });
    const structureRecipe = vi.fn().mockResolvedValue(createStructureResponse(finalUrl));
    const parseXhsRecipe = createParseXhsRecipe({
      fetcher: fetcher as unknown as typeof fetch,
      fetchDetail,
      structureRecipe,
      generateCoverImage: vi.fn().mockResolvedValue({
        coverImageName: 'drunken-crab.png',
        coverImage: '/assets/recipes/drunken-crab.png',
      }),
    });
    const events: unknown[] = [];

    await expect(
      parseXhsRecipe('http://xhslink.com/o/3j7YUMeJQuE', {
        onEvent: (event) => events.push(event),
      }),
    ).resolves.toMatchObject({
      text: 'Title: Drunken Crab',
      recipeDraft: {
        title: 'Drunken Crab',
        coverImageName: 'drunken-crab.png',
        coverImage: '/assets/recipes/drunken-crab.png',
      },
    });

    expect(fetcher).toHaveBeenCalledWith(
      'http://xhslink.com/o/3j7YUMeJQuE',
      expect.objectContaining({
        method: 'GET',
        redirect: 'follow',
      }),
    );
    expect(fetchDetail).toHaveBeenCalledWith(finalUrl);
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'progress',
          message: '已解析小红书短链，正在读取最终笔记链接...',
        }),
      ]),
    );
  });

  it('returns a clear error when an xhslink short url cannot be resolved', async () => {
    const parseXhsRecipe = createParseXhsRecipe({
      fetcher: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        url: 'http://xhslink.com/o/3j7YUMeJQuE',
      }) as unknown as typeof fetch,
      fetchDetail: vi.fn(),
      structureRecipe: vi.fn(),
    });

    await expect(parseXhsRecipe('http://xhslink.com/o/3j7YUMeJQuE')).rejects.toMatchObject({
      message:
        'Failed to resolve the Xiaohongshu short link. Please paste the full xiaohongshu.com note URL if possible.',
      statusCode: 502,
    });
  });

  it('uses the first XHS source image as cover when AI cover generation fails', async () => {
    const finalUrl = 'https://www.xiaohongshu.com/explore/abc?xsec_token=token';
    const fallbackCover = 'https://ci.xiaohongshu.com/source-cover.jpg';
    const detail = createDetail(finalUrl, [fallbackCover]);
    const fetchDetail = vi.fn().mockResolvedValue({
      ok: true,
      message: 'ok',
      data: detail,
    });
    const structureRecipe = vi.fn().mockResolvedValue(createStructureResponse(finalUrl));
    const events: unknown[] = [];
    const parseXhsRecipe = createParseXhsRecipe({
      fetchDetail,
      structureRecipe,
      generateCoverImage: vi.fn().mockRejectedValue(new Error('image failed')),
    });

    await expect(
      parseXhsRecipe(finalUrl, {
        onEvent: (event) => events.push(event),
      }),
    ).resolves.toMatchObject({
      recipeDraft: {
        title: 'Drunken Crab',
        coverImageName: null,
        coverImage: fallbackCover,
      },
    });

    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'progress',
          message: expect.stringContaining('已使用小红书原图作为封面'),
        }),
      ]),
    );
  });
});

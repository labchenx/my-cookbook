import type {
  ParseDouyinTextOptions,
  ParseXhsRecipe,
  ParseXhsRecipeResult,
} from '../types';
import { ParsingError } from './parseDouyinText';
import {
  fetchXhsDownloaderDetail,
  XhsDownloaderError,
  type createFetchXhsDownloaderDetail,
} from './xhsDownloader';
import {
  structureXhsRecipe,
  XhsRecipeStructuringError,
} from './xhsRecipeStructuring';
import { generateRecipeCoverImage } from '../../recipeStructuring/services/structureRecipe';
import type { StructuredRecipeDraft } from '../../recipeStructuring/types';

type ParseXhsRecipeDependencies = {
  fetchDetail?: ReturnType<typeof createFetchXhsDownloaderDetail>;
  structureRecipe?: typeof structureXhsRecipe;
  generateCoverImage?: typeof generateRecipeCoverImage;
  fetcher?: typeof fetch;
  shortLinkTimeoutMs?: number;
};

type ResolvedXhsUrl = {
  url: string;
  resolvedFromShortLink: boolean;
};

function emitStage(
  onEvent: ParseDouyinTextOptions['onEvent'],
  stage: Parameters<NonNullable<ParseDouyinTextOptions['onEvent']>>[0]['stage'],
  message: string,
  progress: number,
) {
  onEvent?.({
    type: 'stage',
    stage,
    message,
    progress,
    createdAt: new Date().toISOString(),
  });
}

function emitProgress(
  onEvent: ParseDouyinTextOptions['onEvent'],
  stage: Parameters<NonNullable<ParseDouyinTextOptions['onEvent']>>[0]['stage'],
  message: string,
  progress: number,
) {
  onEvent?.({
    type: 'progress',
    stage,
    message,
    progress,
    createdAt: new Date().toISOString(),
  });
}

function toParsingError(error: unknown): ParsingError {
  if (error instanceof ParsingError) {
    return error;
  }

  if (error instanceof XhsDownloaderError || error instanceof XhsRecipeStructuringError) {
    return new ParsingError(error.message, error.statusCode, error);
  }

  return new ParsingError(
    error instanceof Error && error.message ? error.message : 'Failed to parse Xiaohongshu content.',
    500,
    error,
  );
}

function getFallbackCoverImage(summaryImages: string[]): string | null {
  return summaryImages.find((url) => /^https?:\/\//i.test(url)) ?? null;
}

async function attachGeneratedCoverImage(
  recipeDraft: StructuredRecipeDraft,
  generateCoverImage: typeof generateRecipeCoverImage,
  fallbackCoverImage: string | null,
  onEvent: ParseDouyinTextOptions['onEvent'],
): Promise<StructuredRecipeDraft> {
  try {
    emitProgress(onEvent, 'structure', '正在生成菜谱封面图...', 92);
    const generatedCover = await generateCoverImage(recipeDraft);
    emitProgress(onEvent, 'structure', '正在保存菜谱封面图...', 96);

    return {
      ...recipeDraft,
      coverImageName: generatedCover.coverImageName,
      coverImage: generatedCover.coverImage,
    };
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? `封面生成失败：${error.message}`
        : '封面生成失败。';

    if (fallbackCoverImage) {
      emitProgress(onEvent, 'structure', `${message} 已使用小红书原图作为封面。`, 96);
      return {
        ...recipeDraft,
        coverImageName: null,
        coverImage: fallbackCoverImage,
      };
    }

    emitProgress(onEvent, 'structure', `${message} 已保留结构化菜谱。`, 96);
    return recipeDraft;
  }
}

function isXhsShortLink(url: string): boolean {
  try {
    return /(^|\.)xhslink\.com$/i.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

async function resolveXhsShortLink(
  url: string,
  fetcher: typeof fetch,
  timeoutMs: number,
): Promise<ResolvedXhsUrl> {
  if (!isXhsShortLink(url)) {
    return {
      url,
      resolvedFromShortLink: false,
    };
  }

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const response = await fetcher(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
      },
      signal: abortController.signal,
    });
    const finalUrl = response.url || url;

    if (!finalUrl || isXhsShortLink(finalUrl)) {
      throw new ParsingError(
        'Failed to resolve the Xiaohongshu short link. Please paste the full xiaohongshu.com note URL if possible.',
        502,
      );
    }

    return {
      url: finalUrl,
      resolvedFromShortLink: true,
    };
  } catch (error) {
    if (error instanceof ParsingError) {
      throw error;
    }

    throw new ParsingError(
      'Failed to resolve the Xiaohongshu short link. Please paste the full xiaohongshu.com note URL if possible.',
      error instanceof Error && error.name === 'AbortError' ? 504 : 502,
      error,
    );
  } finally {
    clearTimeout(timeout);
  }
}

export function createParseXhsRecipe(
  dependencies: ParseXhsRecipeDependencies = {},
): ParseXhsRecipe {
  const fetchDetail = dependencies.fetchDetail ?? fetchXhsDownloaderDetail;
  const structureRecipe = dependencies.structureRecipe ?? structureXhsRecipe;
  const generateCoverImage = dependencies.generateCoverImage ?? generateRecipeCoverImage;
  const fetcher = dependencies.fetcher ?? fetch;
  const shortLinkTimeoutMs = dependencies.shortLinkTimeoutMs ?? 10_000;

  return async (url: string, options?: ParseDouyinTextOptions): Promise<ParseXhsRecipeResult> => {
    try {
      emitStage(options?.onEvent, 'parse_link', '正在解析小红书链接...', 8);
      const resolvedUrl = await resolveXhsShortLink(url, fetcher, shortLinkTimeoutMs);

      if (resolvedUrl.resolvedFromShortLink) {
        emitProgress(options?.onEvent, 'parse_link', '已解析小红书短链，正在读取最终笔记链接...', 18);
      }

      emitProgress(options?.onEvent, 'fetch_media', '正在读取小红书图文/视频信息...', 40);
      const detailResponse = await fetchDetail(resolvedUrl.url);

      if (!detailResponse.data || detailResponse.data.status !== 'ready') {
        throw new ParsingError(
          detailResponse.message || 'Xiaohongshu parser returned incomplete note data.',
          502,
        );
      }

      emitStage(options?.onEvent, 'structure', '正在调用百炼结构化小红书菜谱...', 82);
      const structuredResponse = await structureRecipe(detailResponse.data);

      if (!structuredResponse.data) {
        throw new ParsingError(
          structuredResponse.message || 'Bailian did not return a Xiaohongshu recipe draft.',
          502,
        );
      }

      const recipeDraft = await attachGeneratedCoverImage(
        structuredResponse.data.recipeDraft,
        generateCoverImage,
        getFallbackCoverImage(detailResponse.data.summary.images),
        options?.onEvent,
      );
      emitProgress(options?.onEvent, 'structure', '小红书内容已结构化为菜谱草稿。', 98);

      return {
        text: structuredResponse.data.sourceExcerpt,
        recipeDraft,
      };
    } catch (error) {
      throw toParsingError(error);
    }
  };
}

export const parseXhsRecipe = createParseXhsRecipe();

import { config as loadDotenv } from 'dotenv';
import type {
  GeneratedRecipePayload,
  StructureXhsRecipeRequestBody,
  XhsDownloaderDetailData,
  XhsRecipeStructuringData,
  XhsRecipeStructuringResponse,
} from '../types';
import {
  fixedRecipeTags,
  normalizeFixedRecipeTagsWithDefault,
} from '../../../domain/recipeTags';
import type { StructuredRecipeDraft } from '../../recipeStructuring/types';

loadDotenv();

type BailianEnvironment = Partial<
  Record<
    | 'ALIYUN_BAILIAN_API_KEY'
    | 'DASHSCOPE_API_KEY'
    | 'ALIYUN_BAILIAN_BASE_URL'
    | 'ALIYUN_BAILIAN_MODEL'
    | 'ALIYUN_BAILIAN_VISION_MODEL'
    | 'ALIYUN_BAILIAN_VIDEO_MODEL'
    | 'ALIYUN_BAILIAN_RETRY_ATTEMPTS'
    | 'ALIYUN_BAILIAN_RETRY_BASE_DELAY_MS',
    string
  >
>;

type FetchJsonLikeResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text?: () => Promise<string>;
  clone?: () => FetchJsonLikeResponse;
};

type Fetcher = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
) => Promise<FetchJsonLikeResponse>;

type XhsRecipeStructuringDependencies = {
  env?: BailianEnvironment;
  fetcher?: Fetcher;
};

type BailianRecipeDecision = {
  isRecipe?: unknown;
  reason?: unknown;
  title?: unknown;
  ingredients?: unknown;
  steps?: unknown;
  category?: unknown;
  tags?: unknown;
  imagePrompt?: unknown;
};

const defaultBailianBaseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const defaultBailianModel = 'qwen-plus';
const defaultBailianVisionModel = 'qwen-vl-plus';
const defaultBailianVideoModel = 'qwen3-vl-plus';
const maxVisionImages = 6;
const maxVisionVideos = 1;

export class XhsRecipeStructuringError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = 'XhsRecipeStructuringError';
  }
}

function getApiKey(env: BailianEnvironment) {
  const candidates = [env.ALIYUN_BAILIAN_API_KEY, env.DASHSCOPE_API_KEY];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

function resolveChatEndpoint(env: BailianEnvironment) {
  const baseUrl = (env.ALIYUN_BAILIAN_BASE_URL || defaultBailianBaseUrl).trim().replace(/\/+$/, '');
  return `${baseUrl}/chat/completions`;
}

function getString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function getStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(getString).filter((item) => item.length > 0);
}

function uniqueStrings(values: string[]) {
  return [...new Set(values)];
}

function stripJsonFence(value: string) {
  const trimmed = value.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

function parseDecision(content: string): BailianRecipeDecision {
  const unfenced = stripJsonFence(content);

  try {
    return JSON.parse(unfenced) as BailianRecipeDecision;
  } catch {
    const startIndex = unfenced.indexOf('{');
    const endIndex = unfenced.lastIndexOf('}');

    if (startIndex >= 0 && endIndex > startIndex) {
      return JSON.parse(unfenced.slice(startIndex, endIndex + 1)) as BailianRecipeDecision;
    }

    throw new XhsRecipeStructuringError('Bailian returned invalid recipe JSON.', 502);
  }
}

function extractChatContent(responseBody: unknown): string {
  if (!responseBody || typeof responseBody !== 'object') {
    throw new XhsRecipeStructuringError('Bailian returned an empty response.', 502);
  }

  const choices = (responseBody as { choices?: unknown }).choices;

  if (!Array.isArray(choices) || choices.length === 0) {
    throw new XhsRecipeStructuringError('Bailian response does not contain choices.', 502);
  }

  const message = (choices[0] as { message?: unknown }).message;
  const content =
    message && typeof message === 'object'
      ? (message as { content?: unknown }).content
      : null;

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) =>
        item && typeof item === 'object' && typeof (item as { text?: unknown }).text === 'string'
          ? (item as { text: string }).text
          : '',
      )
      .join('')
      .trim();
  }

  throw new XhsRecipeStructuringError('Bailian response does not contain message content.', 502);
}

function pickFirstString(raw: unknown, keys: string[]): string {
  const queue: unknown[] = [raw];
  const visited = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current || typeof current !== 'object' || visited.has(current)) {
      continue;
    }

    visited.add(current);

    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }

    const record = current as Record<string, unknown>;

    for (const key of keys) {
      const value = getString(record[key]);

      if (value) {
        return value;
      }
    }

    queue.push(...Object.values(record));
  }

  return '';
}

function truncateForMessage(value: string) {
  return value.length > 600 ? `${value.slice(0, 600)}...` : value;
}

async function readResponseBody(response: FetchJsonLikeResponse): Promise<{
  jsonBody: unknown;
  textBody: string;
}> {
  const clonedResponse = typeof response.clone === 'function' ? response.clone() : null;
  const jsonBody = await (clonedResponse ?? response).json().catch(() => null);
  const textBody =
    typeof response.text === 'function' ? await response.text().catch(() => '') : '';

  return {
    jsonBody,
    textBody: typeof textBody === 'string' ? textBody : '',
  };
}

function readErrorMessage(responseBody: unknown, textBody: string, status: number) {
  const code = pickFirstString(responseBody, ['code', 'error_code']);
  const message =
    pickFirstString(responseBody, ['message', 'error', 'detail', 'msg']) ||
    (textBody.trim() && !/<!doctype|<html/i.test(textBody) ? textBody.trim() : '');

  if (code || message) {
    return truncateForMessage(
      [`Bailian request failed with status ${status}`, code, message].filter(Boolean).join(': '),
    );
  }

  return `Bailian request failed with status ${status}.`;
}

function describeFetchFailure(error: unknown) {
  if (error instanceof Error) {
    const cause = error as Error & {
      cause?: {
        code?: unknown;
        message?: unknown;
      };
    };

    if (cause.cause && (cause.cause.code || cause.cause.message)) {
      return [getString(cause.cause.code), getString(cause.cause.message)].filter(Boolean).join(' ');
    }

    return error.message;
  }

  return String(error);
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}

function resolveRetryOptions(env: BailianEnvironment) {
  return {
    attempts: parsePositiveInteger(env.ALIYUN_BAILIAN_RETRY_ATTEMPTS, 5),
    baseDelayMs: parsePositiveInteger(env.ALIYUN_BAILIAN_RETRY_BASE_DELAY_MS, 800),
  };
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateRetryDelay(baseDelayMs: number, attempt: number) {
  return Math.min(baseDelayMs * 2 ** (attempt - 1), 8_000);
}

function createBailianRequestBody(model: string, messages: unknown[]) {
  return JSON.stringify({
    model,
    messages,
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });
}

function isRetriableStatus(status: number) {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

async function fetchWithRetry(
  fetcher: Fetcher,
  input: string,
  init: Parameters<Fetcher>[1],
  retryOptions: ReturnType<typeof resolveRetryOptions>,
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= retryOptions.attempts; attempt += 1) {
    try {
      const response = await fetcher(input, init);

      if (response.ok || !isRetriableStatus(response.status) || attempt === retryOptions.attempts) {
        return response;
      }

      lastError = new Error(`HTTP ${response.status}`);

      await wait(calculateRetryDelay(retryOptions.baseDelayMs, attempt));
    } catch (error) {
      lastError = error;

      if (attempt < retryOptions.attempts) {
        await wait(calculateRetryDelay(retryOptions.baseDelayMs, attempt));
      }
    }
  }

  throw new XhsRecipeStructuringError(
    `Failed to reach Bailian after ${retryOptions.attempts} attempts: ${describeFetchFailure(lastError)}`,
    502,
  );
}

async function requestBailianCompletion(
  fetcher: Fetcher,
  chatEndpoint: string,
  apiKey: string,
  model: string,
  messages: unknown[],
  retryOptions: ReturnType<typeof resolveRetryOptions>,
) {
  const response = await fetchWithRetry(
    fetcher,
    chatEndpoint,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: createBailianRequestBody(model, messages),
    },
    retryOptions,
  );
  const { jsonBody, textBody } = await readResponseBody(response);

  return { response, jsonBody, textBody };
}

function buildSourceExcerpt(detail: XhsDownloaderDetailData) {
  return [
    detail.summary.title ? `Title: ${detail.summary.title}` : '',
    detail.summary.author ? `Author: ${detail.summary.author}` : '',
    detail.summary.publishedAt ? `Published at: ${detail.summary.publishedAt}` : '',
    detail.summary.noteType ? `Note type: ${detail.summary.noteType}` : '',
    detail.summary.contentText ? `Body:\n${detail.summary.contentText}` : '',
    detail.summary.images.length > 0 ? `Image URLs:\n${detail.summary.images.join('\n')}` : '',
    detail.summary.videos.length > 0 ? `Video URLs:\n${detail.summary.videos.join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 12_000);
}

function createListDocument(items: string[], ordered: boolean) {
  const content = items.map((item) => ({
    type: 'listItem',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: item }],
      },
    ],
  }));

  return {
    type: 'doc',
    content: [
      {
        type: ordered ? 'orderedList' : 'bulletList',
        content,
      },
    ],
  } as Record<string, any>;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createListHtml(items: string[], ordered: boolean) {
  const tagName = ordered ? 'ol' : 'ul';
  const itemsHtml = items.map((item) => `<li><p>${escapeHtml(item)}</p></li>`).join('');
  return `<${tagName}>${itemsHtml}</${tagName}>`;
}

function normalizeRecipeDecision(
  decision: BailianRecipeDecision,
  sourceExcerpt: string,
): StructuredRecipeDraft {
  const isRecipe = decision.isRecipe === true;

  if (!isRecipe) {
    const reason = getString(decision.reason) || '当前内容不属于可结构化的菜谱内容。';
    throw new XhsRecipeStructuringError(`当前图文不是菜谱内容：${reason}`, 422);
  }

  const title = getString(decision.title);
  const ingredients = getStringArray(decision.ingredients);
  const steps = getStringArray(decision.steps);
  const tags = normalizeFixedRecipeTagsWithDefault(decision.tags);
  const category = tags[0];
  const imagePrompt =
    getString(decision.imagePrompt) ||
    `一张真实自然的菜谱封面摄影，主体是${title}，食材新鲜，光线柔和，构图干净。`;

  if (!title || ingredients.length === 0 || steps.length === 0) {
    throw new XhsRecipeStructuringError('Bailian recipe result is missing title, ingredients, or steps.', 502);
  }

  return {
    title,
    ingredients,
    steps,
    category,
    tags,
    imagePrompt,
    coverImageName: null,
    coverImage: null,
    rawText: sourceExcerpt,
  };
}

function buildRecipePayload(recipeDraft: StructuredRecipeDraft): GeneratedRecipePayload {
  const ingredientsJson = createListDocument(recipeDraft.ingredients, false);
  const stepsJson = createListDocument(recipeDraft.steps, true);

  return {
    title: recipeDraft.title,
    description: null,
    category: recipeDraft.category,
    tags: recipeDraft.tags,
    ingredientsJson,
    ingredientsHtml: createListHtml(recipeDraft.ingredients, false),
    ingredientsText: recipeDraft.ingredients.join('\n'),
    stepsJson,
    stepsHtml: createListHtml(recipeDraft.steps, true),
    stepsText: recipeDraft.steps.map((step, index) => `${index + 1}. ${step}`).join('\n'),
    status: 'draft',
  };
}

function buildPrompt(detail: XhsDownloaderDetailData) {
  const sourceExcerpt = buildSourceExcerpt(detail);

  return {
    sourceExcerpt,
    userPrompt: [
      '请判断下面的小红书内容是否主要在分享一道可复现的菜谱。',
      '如果不是菜谱，或者缺少明确的配料/做法，返回 isRecipe=false，并给出简短中文 reason。',
      '如果是菜谱，返回 isRecipe=true，并尽量只提取原文、图片或视频中明确出现的菜名、配料和步骤，不要脑补。',
      '只输出 JSON，不要输出解释。',
      '字段固定为：isRecipe, reason, title, ingredients, steps, category, tags, imagePrompt。',
      `其中 ingredients 和 steps 必须是字符串数组；tags 只能从这 8 个固定标签中选择 1 到 3 个：${fixedRecipeTags.join('、')}；category 使用 tags 的第一个标签。`,
      'imagePrompt 返回一句中文封面生成提示词，用于生成写实自然的菜谱封面图。',
      '',
      sourceExcerpt,
    ].join('\n'),
  };
}

function isLikelyVideoUrl(url: string): boolean {
  const normalizedUrl = url.toLowerCase();

  return (
    /\.(mp4|m3u8|mov|webm|m4v)(?:[?#]|$)/i.test(normalizedUrl) ||
    /\/stream\//i.test(normalizedUrl) ||
    /(video|vod|h264|h265|playurl|master)/i.test(normalizedUrl)
  );
}

function normalizeDetailMedia(detail: XhsDownloaderDetailData): XhsDownloaderDetailData {
  const images: string[] = [];
  const videos: string[] = [];

  for (const url of detail.summary.images) {
    if (isLikelyVideoUrl(url)) {
      videos.push(url);
    } else {
      images.push(url);
    }
  }

  for (const url of detail.summary.videos) {
    if (isLikelyVideoUrl(url)) {
      videos.push(url);
    } else {
      images.push(url);
    }
  }

  return {
    ...detail,
    summary: {
      ...detail.summary,
      images: uniqueStrings(images),
      videos: uniqueStrings(videos),
    },
  };
}

function getVisionImageUrls(detail: XhsDownloaderDetailData) {
  return detail.summary.images
    .filter((url) => typeof url === 'string' && /^https?:\/\//i.test(url) && !isLikelyVideoUrl(url))
    .slice(0, maxVisionImages);
}

function getVisionVideoUrls(detail: XhsDownloaderDetailData) {
  return detail.summary.videos
    .filter((url) => typeof url === 'string' && /^https?:\/\//i.test(url) && isLikelyVideoUrl(url))
    .slice(0, maxVisionVideos);
}

function buildTextOnlyChatMessages(userPrompt: string) {
  return [
    {
      role: 'system',
      content: 'You extract structured recipe data from Chinese social posts. Return JSON only.',
    },
    {
      role: 'user',
      content: userPrompt,
    },
  ];
}

function buildChatMessages(detail: XhsDownloaderDetailData, userPrompt: string) {
  const imageUrls = getVisionImageUrls(detail);
  const videoUrls = getVisionVideoUrls(detail);

  if (imageUrls.length === 0 && videoUrls.length === 0) {
    return {
      model: null,
      messages: buildTextOnlyChatMessages(userPrompt),
    };
  }

  return {
    model: videoUrls.length > 0 ? 'video' : 'vision',
    messages: [
      {
        role: 'system',
        content:
          'You extract structured recipe data from Chinese social posts with text, images, or videos. Return JSON only.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `${userPrompt}\n\nInspect images or videos for ingredient lists, cooking steps, captions, subtitles, and visible Chinese text. Do not rely only on the post body.`,
          },
          ...imageUrls.map((url) => ({
            type: 'image_url',
            image_url: { url },
          })),
          ...videoUrls.map((url) => ({
            type: 'video_url',
            video_url: { url },
          })),
        ],
      },
    ],
  };
}

export function createStructureXhsRecipe(
  dependencies: XhsRecipeStructuringDependencies = {},
): (detail: StructureXhsRecipeRequestBody['detail']) => Promise<XhsRecipeStructuringResponse> {
  const fetcher = dependencies.fetcher ?? (fetch as Fetcher);

  return async (detail) => {
    if (!detail || typeof detail !== 'object') {
      throw new XhsRecipeStructuringError('XHS detail payload is required.', 400);
    }

    if (detail.status !== 'ready') {
      throw new XhsRecipeStructuringError('Please fetch a successful XHS detail result before structuring it.', 400);
    }

    const env = dependencies.env ?? process.env;
    const apiKey = getApiKey(env);

    if (!apiKey) {
      throw new XhsRecipeStructuringError('Bailian API key is not configured.', 500);
    }

    const normalizedDetail = normalizeDetailMedia(detail);
    const textModel = env.ALIYUN_BAILIAN_MODEL?.trim() || defaultBailianModel;
    const visionModel = env.ALIYUN_BAILIAN_VISION_MODEL?.trim() || defaultBailianVisionModel;
    const videoModel =
      env.ALIYUN_BAILIAN_VIDEO_MODEL?.trim() ||
      env.ALIYUN_BAILIAN_VISION_MODEL?.trim() ||
      defaultBailianVideoModel;
    const chatEndpoint = resolveChatEndpoint(env);
    const { sourceExcerpt, userPrompt } = buildPrompt(normalizedDetail);
    const chatRequest = buildChatMessages(normalizedDetail, userPrompt);
    let model =
      chatRequest.model === 'video' ? videoModel : chatRequest.model === 'vision' ? visionModel : textModel;
    const retryOptions = resolveRetryOptions(env);

    let bailianResult:
      | Awaited<ReturnType<typeof requestBailianCompletion>>
      | null = null;

    try {
      bailianResult = await requestBailianCompletion(
        fetcher,
        chatEndpoint,
        apiKey,
        model,
        chatRequest.messages,
        retryOptions,
      );
    } catch (error) {
      if (!chatRequest.model) {
        throw error;
      }

      model = textModel;
      bailianResult = await requestBailianCompletion(
        fetcher,
        chatEndpoint,
        apiKey,
        model,
        buildTextOnlyChatMessages(userPrompt),
        retryOptions,
      );
    }

    if (!bailianResult.response.ok && chatRequest.model) {
      model = textModel;
      bailianResult = await requestBailianCompletion(
        fetcher,
        chatEndpoint,
        apiKey,
        model,
        buildTextOnlyChatMessages(userPrompt),
        retryOptions,
      );
    }

    if (!bailianResult.response.ok) {
      throw new XhsRecipeStructuringError(
        readErrorMessage(bailianResult.jsonBody, bailianResult.textBody, bailianResult.response.status),
        502,
      );
    }

    const content = extractChatContent(bailianResult.jsonBody);
    const recipeDraft = normalizeRecipeDecision(parseDecision(content), sourceExcerpt);
    const recipePayload = buildRecipePayload(recipeDraft);

    const data: XhsRecipeStructuringData = {
      sourceUrl: normalizedDetail.url,
      sourceExcerpt,
      recipeDraft,
      recipePayload,
      model,
    };

    return {
      ok: true,
      message: 'Bailian structured the Xiaohongshu content into a recipe draft.',
      data,
    };
  };
}

export const structureXhsRecipe = createStructureXhsRecipe();


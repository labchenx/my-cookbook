import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { config as loadDotenv } from 'dotenv';
import type { ParsingProgressEvent, ParsingStageEvent } from '../../parsing/types';
import type { RecipeSourceType, StructuredRecipeDraft } from '../types';

loadDotenv();

type StructureRecipeOptions = {
  sourceType?: RecipeSourceType;
  sourceUrl?: string;
  onEvent?: (event: ParsingStageEvent | ParsingProgressEvent) => void;
};

type FetchResponseLike = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text?: () => Promise<string>;
  arrayBuffer?: () => Promise<ArrayBuffer>;
  headers?: {
    get: (name: string) => string | null;
  };
};

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<FetchResponseLike>;

type StructureRecipeDependencies = {
  env?: NodeJS.ProcessEnv;
  fetch?: FetchLike;
  mkdir?: typeof mkdir;
  writeFile?: typeof writeFile;
  outputDirectory?: string;
  now?: () => number;
  createId?: () => string;
};

type BailianStructuredRecipe = {
  title?: unknown;
  ingredients?: unknown;
  steps?: unknown;
  category?: unknown;
  tags?: unknown;
  imagePrompt?: unknown;
};

export type StructureRecipe = (
  rawText: string,
  options?: StructureRecipeOptions,
) => Promise<StructuredRecipeDraft>;

export class RecipeStructuringError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'RecipeStructuringError';
  }
}

const defaultTextBaseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const defaultImageEndpoint =
  'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
const defaultOutputDirectory = path.resolve('src/assets/recipes');

function getApiKey(env: NodeJS.ProcessEnv) {
  const candidates = [env.ALIYUN_BAILIAN_API_KEY, env.DASHSCOPE_API_KEY];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

function clampProgress(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function emitProgress(
  onEvent: StructureRecipeOptions['onEvent'],
  message: string,
  progress: number,
) {
  if (!onEvent) {
    return;
  }

  onEvent({
    type: 'progress',
    stage: 'structure',
    message,
    progress: clampProgress(progress),
    createdAt: new Date().toISOString(),
  });
}

function emitStage(
  onEvent: StructureRecipeOptions['onEvent'],
  message: string,
  progress: number,
) {
  if (!onEvent) {
    return;
  }

  onEvent({
    type: 'stage',
    stage: 'structure',
    message,
    progress: clampProgress(progress),
    createdAt: new Date().toISOString(),
  });
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(getString).filter((item) => item.length > 0);
}

function stripJsonFence(value: string) {
  const trimmed = value.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);

  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

function parseJsonObject(content: string): BailianStructuredRecipe {
  const unfenced = stripJsonFence(content);

  try {
    return JSON.parse(unfenced) as BailianStructuredRecipe;
  } catch {
    const startIndex = unfenced.indexOf('{');
    const endIndex = unfenced.lastIndexOf('}');

    if (startIndex >= 0 && endIndex > startIndex) {
      return JSON.parse(unfenced.slice(startIndex, endIndex + 1)) as BailianStructuredRecipe;
    }

    throw new RecipeStructuringError('Bailian returned invalid recipe JSON.');
  }
}

function normalizeStructuredRecipe(
  value: BailianStructuredRecipe,
  rawText: string,
): Omit<StructuredRecipeDraft, 'coverImageName' | 'coverImage' | 'rawText'> {
  const title = getString(value.title);
  const ingredients = getStringArray(value.ingredients);
  const steps = getStringArray(value.steps);

  if (!title || ingredients.length === 0 || steps.length === 0) {
    throw new RecipeStructuringError('Bailian recipe result is missing title, ingredients, or steps.');
  }

  const category = getString(value.category) || '家常菜';
  const tags = Array.from(new Set(getStringArray(value.tags))).slice(0, 8);
  const imagePrompt =
    getString(value.imagePrompt) ||
    `一张真实自然的菜谱封面摄影，主体是${title}，食材新鲜，光线柔和，构图干净。`;

  return {
    title,
    ingredients,
    steps,
    category,
    tags,
    imagePrompt,
  };
}

function resolveChatEndpoint(env: NodeJS.ProcessEnv) {
  const baseUrl = (env.ALIYUN_BAILIAN_BASE_URL || defaultTextBaseUrl).trim().replace(/\/+$/, '');

  return `${baseUrl}/chat/completions`;
}

function resolveImageEndpoint(env: NodeJS.ProcessEnv) {
  return (env.ALIYUN_BAILIAN_IMAGE_BASE_URL || defaultImageEndpoint).trim();
}

function extractChatContent(responseBody: unknown): string {
  if (!responseBody || typeof responseBody !== 'object') {
    throw new RecipeStructuringError('Bailian returned an empty text response.');
  }

  const choices = (responseBody as { choices?: unknown }).choices;

  if (!Array.isArray(choices) || choices.length === 0) {
    throw new RecipeStructuringError('Bailian text response does not contain choices.');
  }

  const message = (choices[0] as { message?: unknown }).message;
  const content = message && typeof message === 'object'
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

  throw new RecipeStructuringError('Bailian text response does not contain message content.');
}

async function readErrorBody(response: FetchResponseLike) {
  try {
    const body = await response.json();

    if (body && typeof body === 'object') {
      const message = getString((body as { message?: unknown }).message);
      const code = getString((body as { code?: unknown }).code);

      return [code, message].filter(Boolean).join(': ');
    }
  } catch {
    // Fall back to status-only messages below.
  }

  return '';
}

function describeFetchFailure(error: unknown) {
  if (error instanceof Error) {
    const cause = (error as Error & { cause?: unknown }).cause;

    if (cause instanceof Error && cause.message) {
      return `${error.message}: ${cause.message}`;
    }

    if (cause && typeof cause === 'object') {
      const code = getString((cause as { code?: unknown }).code);
      const message = getString((cause as { message?: unknown }).message);

      if (code || message) {
        return [code, message].filter(Boolean).join(' ');
      }
    }

    return error.message;
  }

  return String(error);
}

async function fetchWithContext(
  fetcher: FetchLike,
  input: string | URL,
  init: RequestInit | undefined,
  context: string,
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await fetcher(input, init);
    } catch (error) {
      lastError = error;

      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
      }
    }
  }

  throw new RecipeStructuringError(
    `${context}请求失败，已重试 3 次：${describeFetchFailure(lastError)}`,
    lastError,
  );
}

async function requestStructuredRecipe(
  rawText: string,
  options: StructureRecipeOptions,
  dependencies: Required<Pick<StructureRecipeDependencies, 'env' | 'fetch'>>,
) {
  const apiKey = getApiKey(dependencies.env);

  if (!apiKey) {
    throw new RecipeStructuringError('Bailian API key is not configured.');
  }

  const chatEndpoint = resolveChatEndpoint(dependencies.env);
  const response = await fetchWithContext(dependencies.fetch, chatEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: dependencies.env.ALIYUN_BAILIAN_MODEL?.trim() || 'qwen-plus',
      messages: [
        {
          role: 'system',
          content:
            '你是专业菜谱结构化助手。只输出 JSON，不要输出 Markdown。字段必须是 title, ingredients, steps, category, tags, imagePrompt。',
        },
        {
          role: 'user',
          content: [
            `来源平台：${options.sourceType || 'manual_text'}`,
            options.sourceUrl ? `来源链接：${options.sourceUrl}` : '',
            '请从下面视频/图文文案中提取菜谱。',
            '要求：title 是菜名；ingredients 是配料数组；steps 是按顺序的制作步骤数组；category 是一个简短分类；tags 是 3-8 个标签；imagePrompt 是用于生成写实菜谱封面的中文提示词。',
            '配料提取原则：只抽取原文明确说出的配料和用量；原文没有用量就只写配料名；不要猜测、换算、补全或统一成“名称-用量”格式。',
            rawText,
          ]
            .filter(Boolean)
            .join('\n\n'),
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
  }, `百炼文本接口 ${chatEndpoint}`);

  if (!response.ok) {
    const detail = await readErrorBody(response);
    throw new RecipeStructuringError(
      detail || `Bailian text request failed with status ${response.status}.`,
    );
  }

  const content = extractChatContent(await response.json());

  return normalizeStructuredRecipe(parseJsonObject(content), rawText);
}

function extractImageUrl(responseBody: unknown): string {
  if (!responseBody || typeof responseBody !== 'object') {
    throw new RecipeStructuringError('Bailian returned an empty image response.');
  }

  const output = (responseBody as { output?: unknown }).output;

  if (!output || typeof output !== 'object') {
    throw new RecipeStructuringError('Bailian image response does not contain output.');
  }

  const choices = (output as { choices?: unknown }).choices;

  if (Array.isArray(choices)) {
    for (const choice of choices) {
      const message = choice && typeof choice === 'object'
        ? (choice as { message?: unknown }).message
        : null;
      const content = message && typeof message === 'object'
        ? (message as { content?: unknown }).content
        : null;

      if (!Array.isArray(content)) {
        continue;
      }

      for (const item of content) {
        const image = item && typeof item === 'object'
          ? getString((item as { image?: unknown }).image)
          : '';

        if (image) {
          return image;
        }
      }
    }
  }

  const results = (output as { results?: unknown }).results;

  if (Array.isArray(results)) {
    for (const result of results) {
      const url = result && typeof result === 'object'
        ? getString((result as { url?: unknown }).url)
        : '';

      if (url) {
        return url;
      }
    }
  }

  throw new RecipeStructuringError('Bailian image response does not contain an image URL.');
}

function sanitizeBaseName(value: string) {
  const baseName = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return baseName || 'recipe-cover';
}

function inferImageExtension(contentType: string | null, imageUrl: string) {
  const normalizedContentType = contentType?.toLowerCase() ?? '';

  if (normalizedContentType.includes('jpeg') || normalizedContentType.includes('jpg')) {
    return 'jpg';
  }

  if (normalizedContentType.includes('webp')) {
    return 'webp';
  }

  if (normalizedContentType.includes('png')) {
    return 'png';
  }

  const extension = path.extname(new URL(imageUrl).pathname).replace(/^\./, '').toLowerCase();

  return extension || 'png';
}

async function generateCoverImage(
  structuredRecipe: Omit<StructuredRecipeDraft, 'coverImageName' | 'coverImage' | 'rawText'>,
  dependencies: Required<
    Pick<StructureRecipeDependencies, 'env' | 'fetch' | 'mkdir' | 'writeFile' | 'outputDirectory' | 'now' | 'createId'>
  >,
) {
  const apiKey = getApiKey(dependencies.env);

  if (!apiKey) {
    throw new RecipeStructuringError('Bailian API key is not configured.');
  }

  const imagePrompt = structuredRecipe.imagePrompt.slice(0, 800);
  const imageEndpoint = resolveImageEndpoint(dependencies.env);
  const response = await fetchWithContext(dependencies.fetch, imageEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: dependencies.env.ALIYUN_BAILIAN_IMAGE_MODEL?.trim() || 'qwen-image-2.0-pro',
      input: {
        messages: [
          {
            role: 'user',
            content: [{ text: imagePrompt }],
          },
        ],
      },
      parameters: {
        negative_prompt: '低分辨率，低画质，畸形，画面混乱，文字，水印，过度 AI 感。',
        prompt_extend: true,
        watermark: false,
        size: dependencies.env.ALIYUN_BAILIAN_IMAGE_SIZE?.trim() || '2048*2048',
      },
    }),
  }, `百炼图片接口 ${imageEndpoint}`);

  if (!response.ok) {
    const detail = await readErrorBody(response);
    throw new RecipeStructuringError(
      detail || `Bailian image request failed with status ${response.status}.`,
    );
  }

  const imageUrl = extractImageUrl(await response.json());
  const imageResponse = await fetchWithContext(
    dependencies.fetch,
    imageUrl,
    undefined,
    `下载百炼封面图 ${imageUrl}`,
  );

  if (!imageResponse.ok || !imageResponse.arrayBuffer) {
    throw new RecipeStructuringError(`Failed to download generated cover image: ${imageResponse.status}.`);
  }

  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

  if (imageBuffer.length === 0) {
    throw new RecipeStructuringError('Generated cover image is empty.');
  }

  const extension = inferImageExtension(imageResponse.headers?.get('content-type') ?? null, imageUrl);
  const fileName = `${sanitizeBaseName(structuredRecipe.title)}-${dependencies.now()}-${dependencies.createId()}.${extension}`;

  await dependencies.mkdir(dependencies.outputDirectory, { recursive: true });
  await dependencies.writeFile(path.join(dependencies.outputDirectory, fileName), imageBuffer);

  return {
    coverImageName: fileName,
    coverImage: `/assets/recipes/${fileName}`,
  };
}

export function createStructureRecipe(
  dependencies: StructureRecipeDependencies = {},
): StructureRecipe {
  const runtime = {
    env: dependencies.env ?? process.env,
    fetch: dependencies.fetch ?? (globalThis.fetch as unknown as FetchLike),
    mkdir: dependencies.mkdir ?? mkdir,
    writeFile: dependencies.writeFile ?? writeFile,
    outputDirectory: dependencies.outputDirectory ?? defaultOutputDirectory,
    now: dependencies.now ?? (() => Date.now()),
    createId: dependencies.createId ?? (() => randomUUID().slice(0, 8)),
  };

  return async (rawText, options = {}) => {
    const normalizedRawText = typeof rawText === 'string' ? rawText.trim() : '';

    if (!normalizedRawText) {
      throw new RecipeStructuringError('Recipe source text is required.');
    }

    if (!runtime.fetch) {
      throw new RecipeStructuringError('Fetch API is not available for Bailian requests.');
    }

    emitStage(options.onEvent, '正在调用百炼结构化菜谱', 80);
    const structuredRecipe = await requestStructuredRecipe(normalizedRawText, options, runtime);
    emitProgress(options.onEvent, '正在生成分类、标签和封面提示词', 86);

    let coverImageName: string | null = null;
    let coverImage: string | null = null;

    try {
      emitProgress(options.onEvent, '正在生成菜谱封面图', 92);
      const generatedCover = await generateCoverImage(structuredRecipe, runtime);
      emitProgress(options.onEvent, '正在保存封面图', 98);
      coverImageName = generatedCover.coverImageName;
      coverImage = generatedCover.coverImage;
    } catch (error) {
      const message = error instanceof Error && error.message
        ? `封面生成失败，已保留结构化菜谱：${error.message}`
        : '封面生成失败，已保留结构化菜谱。';

      emitProgress(options.onEvent, message, 98);
    }

    emitStage(options.onEvent, '结构化完成', 100);

    return {
      ...structuredRecipe,
      coverImageName,
      coverImage,
      rawText: normalizedRawText,
    };
  };
}

export const structureRecipe = createStructureRecipe();

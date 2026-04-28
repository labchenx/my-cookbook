import { config as loadDotenv } from 'dotenv';
import type {
  XhsDownloaderDetailData,
  ParseXhsDownloaderRequestBody,
  XhsDownloaderDetailResponse,
  XhsDownloaderResultStatus,
  XhsDownloaderServiceState,
  XhsDownloaderSummary,
} from '../types';
import {
  normalizeXhsDownloaderApiBaseUrl,
  readXhsDownloaderDevStatus,
} from './xhsDownloaderDev';

loadDotenv();

type XhsDownloaderEnvironment = Partial<
  Record<
    | 'XHS_DOWNLOADER_API_BASE_URL'
    | 'XHS_DOWNLOADER_COOKIE'
    | 'XHS_DOWNLOADER_PROXY'
    | 'XHS_DOWNLOADER_PROJECT_ROOT'
    | 'XHS_DOWNLOADER_TIMEOUT_MS',
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
    signal?: AbortSignal;
  },
) => Promise<FetchJsonLikeResponse>;

type XhsDownloaderServiceDependencies = {
  env?: XhsDownloaderEnvironment;
  fetcher?: Fetcher;
  cwd?: string;
};

type XhsDownloaderPayload = {
  url: string;
  download: false;
  cookie?: string;
  proxy?: string;
  skip: false;
};

export class XhsDownloaderError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly cause?: unknown,
    readonly responseData: XhsDownloaderDetailData | null = null,
  ) {
    super(message);
    this.name = 'XhsDownloaderError';
  }
}

function parseTimeout(timeoutValue: string | undefined): number {
  const parsedTimeout = Number(timeoutValue);
  return Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : 30_000;
}

function normalizeBaseUrl(env: XhsDownloaderEnvironment): string {
  try {
    return normalizeXhsDownloaderApiBaseUrl(env);
  } catch (error) {
    throw new XhsDownloaderError(
      'XHS_DOWNLOADER_API_BASE_URL is invalid. Expected a full URL such as http://127.0.0.1:5556',
      500,
      error,
    );
  }
}

function normalizeInputUrl(url: string): string {
  if (typeof url !== 'string') {
    throw new XhsDownloaderError('Xiaohongshu URL is required.', 400);
  }

  const normalizedUrl = url.trim();

  if (!normalizedUrl) {
    throw new XhsDownloaderError('Xiaohongshu URL is required.', 400);
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(normalizedUrl);
  } catch (error) {
    throw new XhsDownloaderError('Please enter a valid Xiaohongshu URL.', 400, error);
  }

  if (!/^https?:$/i.test(parsedUrl.protocol)) {
    throw new XhsDownloaderError('Please use an http or https Xiaohongshu URL.', 400);
  }

  return parsedUrl.toString();
}

function buildRequestPayload(url: string, env: XhsDownloaderEnvironment): XhsDownloaderPayload {
  const payload: XhsDownloaderPayload = {
    url,
    download: false,
    skip: false,
  };

  const cookie = env.XHS_DOWNLOADER_COOKIE?.trim();
  const proxy = env.XHS_DOWNLOADER_PROXY?.trim();

  if (cookie) {
    payload.cookie = cookie;
  }

  if (proxy) {
    payload.proxy = proxy;
  }

  return payload;
}

function extractObjectCandidates(raw: unknown): Record<string, unknown>[] {
  const candidates: Record<string, unknown>[] = [];
  const queue: unknown[] = [raw];
  const visited = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current || typeof current !== 'object' || visited.has(current)) {
      continue;
    }

    visited.add(current);

    if (!Array.isArray(current)) {
      candidates.push(current as Record<string, unknown>);
    }

    for (const value of Object.values(current)) {
      if (value && typeof value === 'object') {
        queue.push(value);
      }
    }
  }

  return candidates;
}

function pickFirstString(raw: unknown, keys: string[]): string | null {
  for (const candidate of extractObjectCandidates(raw)) {
    for (const key of keys) {
      const value = candidate[key];

      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
  }

  return null;
}

function pickFirstArray(raw: unknown, keys: string[]): unknown[] | null {
  for (const candidate of extractObjectCandidates(raw)) {
    for (const key of keys) {
      const value = candidate[key];

      if (Array.isArray(value) && value.length > 0) {
        return value;
      }
    }
  }

  return null;
}

function collectMediaUrls(
  raw: unknown,
  directPatterns: RegExp[],
  contextPatterns: RegExp[],
): string[] {
  const urls = new Set<string>();
  const queue: Array<{ value: unknown; context: string }> = [{ value: raw, context: '' }];
  const visited = new Set<unknown>();

  while (queue.length > 0) {
    const currentEntry = queue.shift();
    const current = currentEntry?.value;
    const context = currentEntry?.context ?? '';

    if (!current || typeof current !== 'object' || visited.has(current)) {
      continue;
    }

    visited.add(current);

    if (Array.isArray(current)) {
      current.forEach((value) => queue.push({ value, context }));
      continue;
    }

    const record = current as Record<string, unknown>;

    for (const [key, value] of Object.entries(record)) {
      if (typeof value === 'string') {
        const normalizedValue = value.trim();
        const isGenericUrlField = /^(url|src)$/i.test(key);
        const matchesDirectPattern = directPatterns.some((pattern) => pattern.test(key));
        const matchesContextPattern = contextPatterns.some((pattern) => pattern.test(context));

        if (
          normalizedValue &&
          /^https?:\/\//i.test(normalizedValue) &&
          (matchesDirectPattern || (isGenericUrlField && matchesContextPattern))
        ) {
          urls.add(normalizedValue);
        }
      } else if (value && typeof value === 'object') {
        const nextContext = context ? `${context}.${key}` : key;
        queue.push({ value, context: nextContext });
      }
    }
  }

  return [...urls];
}

function compactStringUrls(values: unknown[] | null | undefined): string[] {
  return (
    values
      ?.filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter((value) => /^https?:\/\//i.test(value)) ?? []
  );
}

function uniqueUrls(values: string[]): string[] {
  return [...new Set(values)];
}

function isLikelyVideoUrl(url: string): boolean {
  const normalizedUrl = url.toLowerCase();

  return (
    /\.(mp4|m3u8|mov|webm|m4v)(?:[?#]|$)/i.test(normalizedUrl) ||
    /\/stream\//i.test(normalizedUrl) ||
    /(video|vod|h264|h265|playurl|master)/i.test(normalizedUrl)
  );
}

function splitMediaUrls(values: string[]): { images: string[]; videos: string[] } {
  const images: string[] = [];
  const videos: string[] = [];

  for (const value of values) {
    if (isLikelyVideoUrl(value)) {
      videos.push(value);
    } else {
      images.push(value);
    }
  }

  return {
    images: uniqueUrls(images),
    videos: uniqueUrls(videos),
  };
}

function inferUpstreamFailure(raw: unknown): string | null {
  const failureText = pickFirstString(raw, ['result', 'message', 'msg', 'detail']) ?? null;

  if (!failureText) {
    return null;
  }

  return /(获取失败|失败|error|failed|not found|empty)/i.test(failureText)
    ? failureText
    : null;
}

function normalizeSummary(raw: unknown): XhsDownloaderSummary {
  const downloadUrls = compactStringUrls(pickFirstArray(raw, ['下载地址']));
  const explicitVideoUrls = compactStringUrls(pickFirstArray(raw, ['动图地址']));
  const fallbackImageUrls = collectMediaUrls(
    raw,
    [/(image|img|photo|picture|cover)/i],
    [/(image|img|photo|picture|cover)/i],
  );
  const fallbackVideoUrls = collectMediaUrls(
    raw,
    [/(video|stream|play|master|mp4|h264)/i],
    [/(video|stream|play|master|mp4|h264)/i],
  );
  const splitDownloadUrls = splitMediaUrls(downloadUrls);
  const splitFallbackImageUrls = splitMediaUrls(fallbackImageUrls);
  const splitFallbackVideoUrls = splitMediaUrls(fallbackVideoUrls);

  return {
    title: pickFirstString(raw, ['title', 'note_title', 'noteTitle', '作品标题']),
    author: pickFirstString(raw, [
      'nickname',
      'author',
      'user_name',
      'username',
      'name',
      '作者昵称',
    ]),
    contentText:
      pickFirstString(raw, ['desc', 'description', 'content', 'text', 'note_content', '作品描述']) ?? '',
    images: uniqueUrls([...splitDownloadUrls.images, ...splitFallbackImageUrls.images]),
    videos: uniqueUrls([
      ...splitDownloadUrls.videos,
      ...explicitVideoUrls,
      ...splitFallbackImageUrls.videos,
      ...splitFallbackVideoUrls.videos,
    ]),
    noteId: pickFirstString(raw, ['note_id', 'id', '作品ID']),
    noteType: pickFirstString(raw, ['note_type', 'type', '作品类型']),
    publishedAt: pickFirstString(raw, ['publish_time', 'time', 'created_at', '发布时间']),
  };
}

function createEmptySummary(contentText = ''): XhsDownloaderSummary {
  return {
    title: null,
    author: null,
    contentText,
    images: [],
    videos: [],
    noteId: null,
    noteType: null,
    publishedAt: null,
  };
}

function normalizeSuccessMessage(status: XhsDownloaderResultStatus): string {
  return status === 'ready'
    ? 'XHS Downloader returned note data successfully.'
    : 'XHS Downloader responded, but the note payload looks incomplete.';
}

async function readResponseBody(response: FetchJsonLikeResponse): Promise<{
  jsonBody: unknown;
  textBody: string | null;
}> {
  const clonedResponse = typeof response.clone === 'function' ? response.clone() : null;
  const jsonBody = await (clonedResponse ?? response).json().catch(() => null);

  if (typeof response.text !== 'function') {
    return {
      jsonBody,
      textBody: null,
    };
  }

  const textBody = await response.text().catch(() => null);

  return {
    jsonBody,
    textBody: typeof textBody === 'string' ? textBody : null,
  };
}

function extractUpstreamErrorMessage(
  status: number,
  jsonBody: unknown,
  textBody: string | null,
): string {
  const detail =
    pickFirstString(jsonBody, ['detail', 'message', 'msg', 'error', 'result']) ??
    (typeof textBody === 'string' && textBody.trim() ? textBody.trim() : null);

  if (!detail) {
    return `XHS Downloader upstream /xhs/detail returned HTTP ${status}.`;
  }

  if (/<!doctype|<html/i.test(detail)) {
    return `XHS Downloader upstream /xhs/detail returned HTTP ${status} with a non-JSON error page.`;
  }

  return `XHS Downloader upstream /xhs/detail returned HTTP ${status}: ${detail.slice(0, 300)}`;
}

function looksLikeDownloaderUnavailable(message: string): boolean {
  return /(econnrefused|fetch failed|socket hang up|networkerror|failed to fetch|enotfound|timed out)/i.test(
    message,
  );
}

function buildErrorResponseData(
  params: {
    url: string;
    upstreamBaseUrl: string;
    service: XhsDownloaderServiceState;
    message: string;
    raw: unknown;
    kind: 'upstream' | 'network' | 'timeout' | 'unknown';
    statusCode: number;
    upstreamStatusCode: number | null;
  },
): XhsDownloaderDetailData {
  return {
    url: params.url,
    upstreamBaseUrl: params.upstreamBaseUrl,
    status: 'upstream_failed',
    service: params.service,
    summary: createEmptySummary(params.message),
    raw: params.raw,
    error: {
      kind: params.kind,
      statusCode: params.statusCode,
      upstreamStatusCode: params.upstreamStatusCode,
      details: params.message,
    },
  };
}

function resolveServiceState(
  env: XhsDownloaderEnvironment,
  upstreamBaseUrl: string,
  cwd: string,
  available: boolean,
): XhsDownloaderServiceState {
  const status = readXhsDownloaderDevStatus(cwd);
  const projectRoot = env.XHS_DOWNLOADER_PROJECT_ROOT?.trim()
    ? status?.projectRoot ?? env.XHS_DOWNLOADER_PROJECT_ROOT.trim()
    : status?.projectRoot ?? null;

  if (status && status.apiBaseUrl === upstreamBaseUrl) {
    return {
      apiBaseUrl: upstreamBaseUrl,
      available,
      source: available ? status.source : status.source,
      projectRootConfigured: status.projectRootConfigured,
      projectRoot,
      message: available && !status.available ? 'XHS Downloader API responded successfully.' : status.message,
      updatedAt: status.updatedAt,
    };
  }

  return {
    apiBaseUrl: upstreamBaseUrl,
    available,
    source: available ? 'unknown' : 'unavailable',
    projectRootConfigured: Boolean(env.XHS_DOWNLOADER_PROJECT_ROOT?.trim()),
    projectRoot,
    message: available
      ? 'XHS Downloader API responded successfully.'
      : 'XHS Downloader API is not available.',
    updatedAt: null,
  };
}

export function createFetchXhsDownloaderDetail(
  dependencies: XhsDownloaderServiceDependencies = {},
): (url: ParseXhsDownloaderRequestBody['url']) => Promise<XhsDownloaderDetailResponse> {
  const fetcher = dependencies.fetcher ?? (fetch as Fetcher);

  return async (url) => {
    const env = dependencies.env ?? process.env;
    const cwd = dependencies.cwd ?? process.cwd();
    const normalizedUrl = normalizeInputUrl(url);
    const upstreamBaseUrl = normalizeBaseUrl(env);
    const requestPayload = buildRequestPayload(normalizedUrl, env);
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), parseTimeout(env.XHS_DOWNLOADER_TIMEOUT_MS));

    try {
      const response = await fetcher(`${upstreamBaseUrl}/xhs/detail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
        signal: abortController.signal,
      });
      const { jsonBody, textBody } = await readResponseBody(response);

      if (!response.ok) {
        const serviceState = resolveServiceState(env, upstreamBaseUrl, cwd, true);
        const message = extractUpstreamErrorMessage(response.status, jsonBody, textBody);
        const statusCode = response.status >= 500 ? 502 : response.status;

        throw new XhsDownloaderError(
          message,
          statusCode,
          undefined,
          buildErrorResponseData({
            url: normalizedUrl,
            upstreamBaseUrl,
            service: serviceState,
            message,
            raw: {
              upstreamStatusCode: response.status,
              body: jsonBody ?? textBody ?? null,
            },
            kind: 'upstream',
            statusCode,
            upstreamStatusCode: response.status,
          }),
        );
      }

      const raw = jsonBody;
      const upstreamFailure = inferUpstreamFailure(raw);
      const summary = normalizeSummary(raw);
      const status: XhsDownloaderResultStatus = upstreamFailure ? 'upstream_failed' : 'ready';

      if (upstreamFailure && !summary.contentText) {
        summary.contentText = upstreamFailure;
      }

      return {
        ok: true,
        message: normalizeSuccessMessage(status),
        data: {
          url: normalizedUrl,
          upstreamBaseUrl,
          status,
          service: resolveServiceState(env, upstreamBaseUrl, cwd, true),
          summary,
          raw,
        },
      };
    } catch (error) {
      if (error instanceof XhsDownloaderError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        const serviceState = resolveServiceState(env, upstreamBaseUrl, cwd, false);
        throw new XhsDownloaderError(
          serviceState.message,
          504,
          error,
          buildErrorResponseData({
            url: normalizedUrl,
            upstreamBaseUrl,
            service: serviceState,
            message: serviceState.message,
            raw: { timeout: true },
            kind: 'timeout',
            statusCode: 504,
            upstreamStatusCode: null,
          }),
        );
      }

      if (error instanceof Error && looksLikeDownloaderUnavailable(error.message)) {
        const serviceState = resolveServiceState(env, upstreamBaseUrl, cwd, false);
        const message =
          serviceState.source === 'unavailable' ? serviceState.message : error.message;
        const statusCode = serviceState.source === 'unavailable' ? 503 : 502;

        throw new XhsDownloaderError(
          message,
          statusCode,
          error,
          buildErrorResponseData({
            url: normalizedUrl,
            upstreamBaseUrl,
            service: serviceState,
            message,
            raw: { networkError: error.message },
            kind: 'network',
            statusCode,
            upstreamStatusCode: null,
          }),
        );
      }

      const fallbackMessage =
        error instanceof Error && error.message
          ? error.message
          : 'Failed to reach the XHS Downloader API.';
      const serviceState = resolveServiceState(env, upstreamBaseUrl, cwd, false);

      throw new XhsDownloaderError(
        fallbackMessage,
        502,
        error,
        buildErrorResponseData({
          url: normalizedUrl,
          upstreamBaseUrl,
          service: serviceState,
          message: fallbackMessage,
          raw: { error: fallbackMessage },
          kind: 'unknown',
          statusCode: 502,
          upstreamStatusCode: null,
        }),
      );
    } finally {
      clearTimeout(timeout);
    }
  };
}

export const fetchXhsDownloaderDetail = createFetchXhsDownloaderDetail();


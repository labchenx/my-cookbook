import type { StructuredRecipeDraft } from '../recipeStructuring/types';

export type ParseDouyinRequestBody = {
  url: string;
};

export type ParseDouyinResponse = {
  text: string;
};

export type ParsingSourcePlatform = 'douyin' | 'xiaohongshu';

export type ParseXhsDownloaderRequestBody = {
  url: string;
};

export type XhsDownloaderServiceSource = 'existing' | 'managed' | 'unavailable' | 'unknown';

export type XhsDownloaderServiceState = {
  apiBaseUrl: string;
  available: boolean;
  source: XhsDownloaderServiceSource;
  projectRootConfigured: boolean;
  projectRoot: string | null;
  message: string;
  updatedAt: string | null;
};

export type XhsDownloaderSummary = {
  title: string | null;
  author: string | null;
  contentText: string;
  images: string[];
  videos: string[];
  noteId: string | null;
  noteType: string | null;
  publishedAt: string | null;
};

export type XhsDownloaderResultStatus = 'ready' | 'upstream_failed';

export type XhsDownloaderErrorDetails = {
  kind: 'upstream' | 'network' | 'timeout' | 'unknown';
  statusCode: number;
  upstreamStatusCode: number | null;
  details: string | null;
};

export type XhsDownloaderDetailData = {
  url: string;
  upstreamBaseUrl: string;
  status: XhsDownloaderResultStatus;
  service: XhsDownloaderServiceState;
  summary: XhsDownloaderSummary;
  raw: unknown;
  error?: XhsDownloaderErrorDetails;
};

export type XhsDownloaderDetailResponse = {
  ok: boolean;
  message: string;
  data: XhsDownloaderDetailData | null;
};

export type GeneratedRecipePayload = {
  title: string;
  coverImageName?: string;
  coverImage?: string;
  description: string | null;
  category: string | null;
  tags: string[];
  ingredientsJson: Record<string, any> | null;
  ingredientsHtml: string | null;
  ingredientsText: string | null;
  stepsJson: Record<string, any> | null;
  stepsHtml: string | null;
  stepsText: string | null;
  status: 'draft' | 'published';
};

export type StructureXhsRecipeRequestBody = {
  detail: XhsDownloaderDetailData;
};

export type XhsRecipeStructuringData = {
  sourceUrl: string;
  sourceExcerpt: string;
  recipeDraft: StructuredRecipeDraft;
  recipePayload: GeneratedRecipePayload;
  model: string;
};

export type XhsRecipeStructuringResponse = {
  ok: boolean;
  message: string;
  data: XhsRecipeStructuringData | null;
};

export type CreateParsingSessionResponse = {
  sessionId: string;
};

export type ParsingStage =
  | 'parse_link'
  | 'fetch_media'
  | 'extract_audio'
  | 'transcribe'
  | 'structure'
  | 'write_markdown'
  | 'completed'
  | 'failed';

export type ParsingStageEvent = {
  type: 'stage';
  stage: ParsingStage;
  message: string;
  progress?: number;
  createdAt: string;
};

export type ParsingProgressEvent = {
  type: 'progress';
  stage: ParsingStage;
  message: string;
  progress: number;
  createdAt: string;
};

export type ParsingResultEvent = {
  type: 'result';
  text: string;
  recipeDraft?: StructuredRecipeDraft;
  sourceType?: ParsingSourcePlatform;
  createdAt: string;
};

export type ParsingErrorEvent = {
  type: 'error';
  stage: 'failed';
  message: string;
  createdAt: string;
};

export type ParsingParseErrorEvent = {
  type: 'parse_error';
  stage: 'failed';
  message: string;
  createdAt: string;
};

export type ParsingDoneEvent = {
  type: 'done';
  status: 'completed' | 'failed';
  createdAt: string;
};

export type ParsingSessionEvent =
  | ParsingStageEvent
  | ParsingProgressEvent
  | ParsingResultEvent
  | ParsingErrorEvent
  | ParsingParseErrorEvent
  | ParsingDoneEvent;

export type ParseDouyinTextOptions = {
  onEvent?: (event: ParsingStageEvent | ParsingProgressEvent) => void;
};

export type ParseDouyinText = (url: string, options?: ParseDouyinTextOptions) => Promise<string>;

export type ParseXhsRecipeResult = {
  text: string;
  recipeDraft: StructuredRecipeDraft;
};

export type ParseXhsRecipe = (
  url: string,
  options?: ParseDouyinTextOptions,
) => Promise<ParseXhsRecipeResult>;

import type { StructuredRecipeDraft } from '../recipeStructuring/types';

export type ParseDouyinRequestBody = {
  url: string;
};

export type ParseDouyinResponse = {
  text: string;
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

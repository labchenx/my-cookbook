import { randomUUID } from 'node:crypto';
import { config as loadDotenv } from 'dotenv';
import {
  type ParseDouyinText,
  type ParsingSessionEvent,
  type ParsingStage,
  type ParsingStageEvent,
} from '../types';
import {
  ParsingError,
  createParseDouyinText,
  resolveDouyinParsingRequest,
} from './parseDouyinText';
import {
  structureRecipe as defaultStructureRecipe,
  type StructureRecipe,
} from '../../recipeStructuring/services/structureRecipe';

loadDotenv();

type ParsingSessionStatus = 'working' | 'completed' | 'failed';

type ProgressProfile = {
  offset: number;
  lastProgress: number;
};

type ParsingSessionRecord = {
  id: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  status: ParsingSessionStatus;
  currentStage: ParsingStage | null;
  progressProfile: ProgressProfile;
  events: ParsingSessionEvent[];
  listeners: Set<(event: ParsingSessionEvent) => void>;
  cleanupTimer: NodeJS.Timeout | null;
};

type ParsingSessionsServiceDependencies = {
  parseText?: ParseDouyinText;
  structureRecipe?: StructureRecipe;
  env?: NodeJS.ProcessEnv;
  cwd?: string;
  createSessionId?: () => string;
  random?: () => number;
  retentionMs?: number;
};

type ParsingSessionSnapshot = {
  id: string;
  status: ParsingSessionStatus;
  currentStage: ParsingStage | null;
  events: ParsingSessionEvent[];
};

const defaultRetentionMs = 15 * 60 * 1000;
const progressRanges: Record<Exclude<ParsingStage, 'completed' | 'failed'>, { min: number; max: number }> = {
  parse_link: { min: 4, max: 7 },
  fetch_media: { min: 9, max: 52 },
  extract_audio: { min: 53, max: 57 },
  transcribe: { min: 59, max: 77 },
  write_markdown: { min: 77, max: 80 },
  structure: { min: 79, max: 98 },
};

function cloneEvent<T extends ParsingSessionEvent>(event: T): T {
  return JSON.parse(JSON.stringify(event)) as T;
}

function createSessionSnapshot(session: ParsingSessionRecord): ParsingSessionSnapshot {
  return {
    id: session.id,
    status: session.status,
    currentStage: session.currentStage,
    events: session.events.map((event) => cloneEvent(event)),
  };
}

function createProgressProfile(random: () => number): ProgressProfile {
  return {
    offset: Math.round((random() - 0.5) * 4),
    lastProgress: 0,
  };
}

function clampProgress(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function adjustEventProgress(
  session: ParsingSessionRecord,
  event: ParsingSessionEvent,
): ParsingSessionEvent {
  if (event.type !== 'stage' && event.type !== 'progress') {
    return event;
  }

  if (event.stage === 'failed') {
    const { progress: _progress, ...eventWithoutProgress } = event;
    return eventWithoutProgress as ParsingSessionEvent;
  }

  if (event.stage === 'completed') {
    session.progressProfile.lastProgress = 100;
    return {
      ...event,
      progress: 100,
    };
  }

  const range = progressRanges[event.stage];
  const baseProgress =
    typeof event.progress === 'number'
      ? event.progress
      : Math.round((range.min + range.max) / 2);
  const offsetProgress = clampProgress(
    baseProgress + session.progressProfile.offset,
    range.min,
    range.max,
  );
  const nextProgress = Math.max(offsetProgress, session.progressProfile.lastProgress);
  const boundedProgress = clampProgress(nextProgress, range.min, range.max);

  session.progressProfile.lastProgress = boundedProgress;

  return {
    ...event,
    progress: boundedProgress,
  };
}

export function createParsingSessionsService(
  dependencies: ParsingSessionsServiceDependencies = {},
) {
  const parseText =
    dependencies.parseText ??
    createParseDouyinText({
      env: dependencies.env,
      cwd: dependencies.cwd,
    });
  const structureRecipe = dependencies.structureRecipe ?? defaultStructureRecipe;
  const env = dependencies.env ?? process.env;
  const cwd = dependencies.cwd ?? process.cwd();
  const createSessionId = dependencies.createSessionId ?? (() => randomUUID());
  const random = dependencies.random ?? Math.random;
  const retentionMs = dependencies.retentionMs ?? defaultRetentionMs;
  const sessions = new Map<string, ParsingSessionRecord>();

  function publishEvent(session: ParsingSessionRecord, event: ParsingSessionEvent) {
    const publishedEvent = adjustEventProgress(session, event);

    session.events.push(publishedEvent);
    session.updatedAt = publishedEvent.createdAt;

    if (publishedEvent.type === 'stage' || publishedEvent.type === 'progress') {
      session.currentStage = publishedEvent.stage;
      session.status = publishedEvent.stage === 'failed' ? 'failed' : session.status;
    }

    if (publishedEvent.type === 'error' || publishedEvent.type === 'parse_error') {
      session.currentStage = 'failed';
      session.status = 'failed';
    }

    if (publishedEvent.type === 'done') {
      session.status = publishedEvent.status;
      session.currentStage = publishedEvent.status === 'completed' ? 'completed' : 'failed';
    }

    for (const listener of session.listeners) {
      listener(cloneEvent(publishedEvent));
    }
  }

  function scheduleCleanup(session: ParsingSessionRecord) {
    if (session.cleanupTimer) {
      clearTimeout(session.cleanupTimer);
    }

    session.cleanupTimer = setTimeout(() => {
      sessions.delete(session.id);
    }, retentionMs);
  }

  function ensureFinalStage(
    session: ParsingSessionRecord,
    stage: 'completed' | 'failed',
    message: string,
  ) {
    if (session.currentStage === stage) {
      return;
    }

    const finalEvent: ParsingStageEvent = {
      type: 'stage',
      stage,
      message,
      progress: stage === 'completed' ? 100 : undefined,
      createdAt: new Date().toISOString(),
    };

    publishEvent(session, finalEvent);
  }

  async function runSession(session: ParsingSessionRecord) {
    try {
      const text = await parseText(session.url, {
        onEvent: (event) => {
          publishEvent(session, cloneEvent(event));
        },
      });
      const recipeDraft = await structureRecipe(text, {
        sourceType: 'douyin',
        sourceUrl: session.url,
        onEvent: (event) => {
          publishEvent(session, cloneEvent(event));
        },
      });

      ensureFinalStage(session, 'completed', '解析完成，结果已输出到控制台。');
      publishEvent(session, {
        type: 'result',
        text,
        recipeDraft,
        createdAt: new Date().toISOString(),
      });
      publishEvent(session, {
        type: 'done',
        status: 'completed',
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      const message =
        error instanceof ParsingError
          ? error.message
          : error instanceof Error && error.message
            ? error.message
            : 'Failed to parse Douyin content.';
      const createdAt = new Date().toISOString();

      ensureFinalStage(session, 'failed', message);
      publishEvent(session, {
        type: 'parse_error',
        stage: 'failed',
        message,
        createdAt,
      });
      publishEvent(session, {
        type: 'error',
        stage: 'failed',
        message,
        createdAt,
      });
      publishEvent(session, {
        type: 'done',
        status: 'failed',
        createdAt,
      });
    } finally {
      scheduleCleanup(session);
    }
  }

  return {
    async createSession(url: string) {
      const { normalizedUrl } = resolveDouyinParsingRequest(url, { env, cwd });
      const createdAt = new Date().toISOString();
      const session: ParsingSessionRecord = {
        id: createSessionId(),
        url: normalizedUrl,
        createdAt,
        updatedAt: createdAt,
        status: 'working',
        currentStage: 'parse_link',
        progressProfile: createProgressProfile(random),
        events: [],
        listeners: new Set(),
        cleanupTimer: null,
      };

      sessions.set(session.id, session);
      publishEvent(session, {
        type: 'stage',
        stage: 'parse_link',
        message: '正在准备解析任务...',
        progress: 4,
        createdAt,
      });
      queueMicrotask(() => {
        void runSession(session);
      });

      return { sessionId: session.id };
    },
    getSession(sessionId: string): ParsingSessionSnapshot | null {
      const session = sessions.get(sessionId);
      return session ? createSessionSnapshot(session) : null;
    },
    subscribe(sessionId: string, listener: (event: ParsingSessionEvent) => void) {
      const session = sessions.get(sessionId);

      if (!session) {
        return null;
      }

      session.listeners.add(listener);

      return {
        snapshot: createSessionSnapshot(session),
        unsubscribe: () => {
          session.listeners.delete(listener);
        },
      };
    },
  };
}

export const parsingSessionsService = createParsingSessionsService();

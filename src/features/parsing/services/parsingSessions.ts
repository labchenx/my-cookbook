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

loadDotenv();

type ParsingSessionStatus = 'working' | 'completed' | 'failed';

type ParsingSessionRecord = {
  id: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  status: ParsingSessionStatus;
  currentStage: ParsingStage | null;
  events: ParsingSessionEvent[];
  listeners: Set<(event: ParsingSessionEvent) => void>;
  cleanupTimer: NodeJS.Timeout | null;
};

type ParsingSessionsServiceDependencies = {
  parseText?: ParseDouyinText;
  env?: NodeJS.ProcessEnv;
  cwd?: string;
  createSessionId?: () => string;
  retentionMs?: number;
};

type ParsingSessionSnapshot = {
  id: string;
  status: ParsingSessionStatus;
  currentStage: ParsingStage | null;
  events: ParsingSessionEvent[];
};

const defaultRetentionMs = 15 * 60 * 1000;

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

export function createParsingSessionsService(
  dependencies: ParsingSessionsServiceDependencies = {},
) {
  const parseText =
    dependencies.parseText ??
    createParseDouyinText({
      env: dependencies.env,
      cwd: dependencies.cwd,
    });
  const env = dependencies.env ?? process.env;
  const cwd = dependencies.cwd ?? process.cwd();
  const createSessionId = dependencies.createSessionId ?? (() => randomUUID());
  const retentionMs = dependencies.retentionMs ?? defaultRetentionMs;
  const sessions = new Map<string, ParsingSessionRecord>();

  function publishEvent(session: ParsingSessionRecord, event: ParsingSessionEvent) {
    session.events.push(event);
    session.updatedAt = event.createdAt;

    if (event.type === 'stage' || event.type === 'progress') {
      session.currentStage = event.stage;
      session.status = event.stage === 'failed' ? 'failed' : session.status;
    }

    if (event.type === 'error' || event.type === 'parse_error') {
      session.currentStage = 'failed';
      session.status = 'failed';
    }

    if (event.type === 'done') {
      session.status = event.status;
      session.currentStage = event.status === 'completed' ? 'completed' : 'failed';
    }

    for (const listener of session.listeners) {
      listener(cloneEvent(event));
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

      ensureFinalStage(session, 'completed', '解析完成，结果已输出到控制台。');
      publishEvent(session, {
        type: 'result',
        text,
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
        events: [
          {
            type: 'stage',
            stage: 'parse_link',
            message: '正在准备解析任务...',
            progress: 4,
            createdAt,
          },
        ],
        listeners: new Set(),
        cleanupTimer: null,
      };

      sessions.set(session.id, session);
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

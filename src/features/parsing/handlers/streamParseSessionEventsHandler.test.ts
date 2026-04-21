import type { Request, Response } from 'express';
import { createStreamParseSessionEventsHandler } from './streamParseSessionEventsHandler';

function createRequestMock(sessionId = 'session-1') {
  const listeners = new Map<string, () => void>();

  return {
    params: { sessionId },
    on: vi.fn((event: string, handler: () => void) => {
      listeners.set(event, handler);
    }),
    listeners,
  };
}

function createResponseMock() {
  return {
    setHeader: vi.fn(),
    flushHeaders: vi.fn(),
    write: vi.fn(),
    end: vi.fn(),
    status: vi.fn(() => ({
      json: vi.fn(),
    })),
  };
}

describe('createStreamParseSessionEventsHandler', () => {
  it('replays stored events and ends finished sessions', () => {
    const request = createRequestMock();
    const response = createResponseMock();
    const unsubscribe = vi.fn();
    const handler = createStreamParseSessionEventsHandler({
      sessions: {
        getSession: vi.fn(),
        subscribe: vi.fn().mockReturnValue({
          snapshot: {
            id: 'session-1',
            status: 'completed',
            currentStage: 'completed',
            events: [
              {
                type: 'stage',
                stage: 'completed',
                message: '解析完成',
                progress: 100,
                createdAt: '2026-04-21T10:00:00.000Z',
              },
              {
                type: 'done',
                status: 'completed',
                createdAt: '2026-04-21T10:00:01.000Z',
              },
            ],
          },
          unsubscribe,
        }),
      },
    });

    handler(request as unknown as Request, response as unknown as Response, vi.fn());

    expect(response.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
    expect(response.write).toHaveBeenCalledWith(
      expect.stringContaining('event: stage'),
    );
    expect(response.write).toHaveBeenCalledWith(
      expect.stringContaining('event: done'),
    );
    expect(response.end).toHaveBeenCalled();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('returns 404 when the session does not exist', () => {
    const request = createRequestMock('missing');
    const response = createResponseMock();
    const json = vi.fn();
    response.status = vi.fn(() => ({ json }));

    const handler = createStreamParseSessionEventsHandler({
      sessions: {
        getSession: vi.fn(),
        subscribe: vi.fn().mockReturnValue(null),
      },
    });

    handler(request as unknown as Request, response as unknown as Response, vi.fn());

    expect(response.status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ message: 'Parsing session not found.' });
  });
});

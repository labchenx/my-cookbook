import type { RequestHandler, Response } from 'express';
import { parsingSessionsService } from '../services/parsingSessions';
import type { ParsingSessionEvent } from '../types';

type StreamParseSessionEventsHandlerDependencies = {
  sessions?: Pick<typeof parsingSessionsService, 'getSession' | 'subscribe'>;
};

function writeSseEvent(response: Response, eventName: ParsingSessionEvent['type'], payload: ParsingSessionEvent) {
  response.write(`event: ${eventName}\n`);
  response.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export function createStreamParseSessionEventsHandler(
  dependencies: StreamParseSessionEventsHandlerDependencies = {},
): RequestHandler {
  const sessions = dependencies.sessions ?? parsingSessionsService;

  return (request, response) => {
    const sessionId = request.params.sessionId;
    const subscription = typeof sessionId === 'string' ? sessions.subscribe(sessionId, (event) => {
      writeSseEvent(response, event.type, event);

      if (event.type === 'done') {
        response.end();
      }
    }) : null;

    if (!subscription) {
      response.status(404).json({ message: 'Parsing session not found.' });
      return;
    }

    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders?.();

    for (const event of subscription.snapshot.events) {
      writeSseEvent(response, event.type, event);
    }

    if (subscription.snapshot.status !== 'working') {
      response.end();
      subscription.unsubscribe();
      return;
    }

    request.on('close', () => {
      subscription.unsubscribe();
      response.end();
    });
  };
}

export const streamParseSessionEventsHandler = createStreamParseSessionEventsHandler();

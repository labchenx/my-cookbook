import type { RequestHandler } from 'express';
import { parsingSessionsService } from '../services/parsingSessions';
import { ParsingError } from '../services/parseDouyinText';
import type { ParseDouyinRequestBody } from '../types';

type CreateParseSessionHandlerDependencies = {
  sessions?: Pick<typeof parsingSessionsService, 'createSession'>;
};

export function createCreateParseSessionHandler(
  dependencies: CreateParseSessionHandlerDependencies = {},
): RequestHandler {
  const sessions = dependencies.sessions ?? parsingSessionsService;

  return async (request, response) => {
    const body = request.body as Partial<ParseDouyinRequestBody> | undefined;

    try {
      const session = await sessions.createSession(typeof body?.url === 'string' ? body.url : '');
      response.status(201).json(session);
    } catch (error) {
      if (error instanceof ParsingError) {
        response.status(error.statusCode).json({ message: error.message });
        return;
      }

      console.error('Failed to create Douyin parsing session', error);
      response.status(500).json({ message: 'Failed to create Douyin parsing session.' });
    }
  };
}

export const createParseSessionHandler = createCreateParseSessionHandler();

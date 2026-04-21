import type { RequestHandler } from 'express';
import { ParsingError, parseDouyinText } from '../services/parseDouyinText';
import type { ParseDouyinRequestBody } from '../types';

type ParseDouyinHandlerDependencies = {
  parseText?: (url: string) => Promise<string>;
};

export function createParseDouyinHandler(
  dependencies: ParseDouyinHandlerDependencies = {},
): RequestHandler {
  const parseText = dependencies.parseText ?? parseDouyinText;

  return async (request, response) => {
    const body = request.body as Partial<ParseDouyinRequestBody> | undefined;

    try {
      const text = await parseText(typeof body?.url === 'string' ? body.url : '');

      response.status(200).json({ text });
    } catch (error) {
      if (error instanceof ParsingError) {
        response.status(error.statusCode).json({ message: error.message });
        return;
      }

      console.error('Failed to parse Douyin content', error);
      response.status(500).json({ message: 'Failed to parse Douyin content.' });
    }
  };
}

export const parseDouyinHandler = createParseDouyinHandler();

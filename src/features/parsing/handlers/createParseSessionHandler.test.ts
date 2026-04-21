import type { Request, Response } from 'express';
import { createCreateParseSessionHandler } from './createParseSessionHandler';
import { ParsingError } from '../services/parseDouyinText';

function createResponseMock() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));

  return {
    json,
    status,
  };
}

describe('createCreateParseSessionHandler', () => {
  it('returns the created session id', async () => {
    const response = createResponseMock();
    const handler = createCreateParseSessionHandler({
      sessions: {
        createSession: vi.fn().mockResolvedValue({ sessionId: 'session-1' }),
      },
    });

    await handler(
      { body: { url: 'https://v.douyin.com/example/' } } as Request,
      response as unknown as Response,
      vi.fn(),
    );

    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith({ sessionId: 'session-1' });
  });

  it('returns the parsing error status and message', async () => {
    const response = createResponseMock();
    const handler = createCreateParseSessionHandler({
      sessions: {
        createSession: vi.fn().mockRejectedValue(new ParsingError('Douyin url is required.', 400)),
      },
    });

    await handler(
      { body: { url: '' } } as Request,
      response as unknown as Response,
      vi.fn(),
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: 'Douyin url is required.' });
  });
});

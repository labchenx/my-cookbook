import type { Request, Response } from 'express';
import { createParseDouyinHandler } from './parseDouyinHandler';
import { ParsingError } from '../services/parseDouyinText';

function createResponseMock() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));

  return {
    json,
    status,
  };
}

describe('createParseDouyinHandler', () => {
  it('returns the parsed text payload on success', async () => {
    const response = createResponseMock();
    const handler = createParseDouyinHandler({
      parseText: vi.fn().mockResolvedValue('parsed text'),
    });

    await handler(
      { body: { url: 'https://v.douyin.com/example/' } } as Request,
      response as unknown as Response,
      vi.fn(),
    );

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ text: 'parsed text' });
  });

  it('returns the parsing error status and message', async () => {
    const response = createResponseMock();
    const handler = createParseDouyinHandler({
      parseText: vi.fn().mockRejectedValue(new ParsingError('Douyin url is required.', 400)),
    });

    await handler(
      { body: { url: '' } } as Request,
      response as unknown as Response,
      vi.fn(),
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ message: 'Douyin url is required.' });
  });

  it('returns a generic server error for unexpected failures', async () => {
    const response = createResponseMock();
    const handler = createParseDouyinHandler({
      parseText: vi.fn().mockRejectedValue(new Error('boom')),
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await handler(
      { body: { url: 'https://v.douyin.com/example/' } } as Request,
      response as unknown as Response,
      vi.fn(),
    );

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({ message: 'Failed to parse Douyin content.' });

    errorSpy.mockRestore();
  });
});

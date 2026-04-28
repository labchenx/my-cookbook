import type { RequestHandler } from 'express';
import { fetchXhsDownloaderDetail, XhsDownloaderError } from '../services/xhsDownloader';
import type { ParseXhsDownloaderRequestBody } from '../types';

type GetXhsDownloaderDetailHandlerDependencies = {
  fetchDetail?: (url: string) => ReturnType<typeof fetchXhsDownloaderDetail>;
};

export function createGetXhsDownloaderDetailHandler(
  dependencies: GetXhsDownloaderDetailHandlerDependencies = {},
): RequestHandler {
  const fetchDetail = dependencies.fetchDetail ?? fetchXhsDownloaderDetail;

  return async (request, response) => {
    const body = request.body as Partial<ParseXhsDownloaderRequestBody> | undefined;

    try {
      const payload = await fetchDetail(typeof body?.url === 'string' ? body.url : '');
      response.status(200).json(payload);
    } catch (error) {
      if (error instanceof XhsDownloaderError) {
        response
          .status(error.statusCode)
          .json({ ok: false, message: error.message, data: error.responseData });
        return;
      }

      console.error('Failed to fetch XHS Downloader detail', error);
      response
        .status(500)
        .json({ ok: false, message: 'Failed to fetch XHS Downloader detail.', data: null });
    }
  };
}

export const getXhsDownloaderDetailHandler = createGetXhsDownloaderDetailHandler();

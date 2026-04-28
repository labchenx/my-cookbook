import { Router } from 'express';
import { createParseSessionHandler } from './handlers/createParseSessionHandler';
import { getXhsDownloaderDetailHandler } from './handlers/getXhsDownloaderDetailHandler';
import { parseDouyinHandler } from './handlers/parseDouyinHandler';
import { structureXhsRecipeHandler } from './handlers/structureXhsRecipeHandler';
import { streamParseSessionEventsHandler } from './handlers/streamParseSessionEventsHandler';

export const parsingRouter = Router();

parsingRouter.post('/sessions', createParseSessionHandler);
parsingRouter.get('/sessions/:sessionId/events', streamParseSessionEventsHandler);
parsingRouter.post('/douyin', parseDouyinHandler);
parsingRouter.post('/douyin/sessions', createParseSessionHandler);
parsingRouter.get('/douyin/sessions/:sessionId/events', streamParseSessionEventsHandler);
parsingRouter.post('/xhs-downloader/detail', getXhsDownloaderDetailHandler);
parsingRouter.post('/xhs-downloader/structure', structureXhsRecipeHandler);

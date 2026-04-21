import { Router } from 'express';
import { createParseSessionHandler } from './handlers/createParseSessionHandler';
import { parseDouyinHandler } from './handlers/parseDouyinHandler';
import { streamParseSessionEventsHandler } from './handlers/streamParseSessionEventsHandler';

export const parsingRouter = Router();

parsingRouter.post('/douyin', parseDouyinHandler);
parsingRouter.post('/douyin/sessions', createParseSessionHandler);
parsingRouter.get('/douyin/sessions/:sessionId/events', streamParseSessionEventsHandler);

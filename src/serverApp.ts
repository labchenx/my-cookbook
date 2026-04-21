import express from 'express';
import { createRecipeHandler, deleteRecipeHandler, getRecipeDetailHandler, getRecipesHandler } from './api/recipes';
import { uploadRecipeImageHandler } from './api/uploads';
import { parsingRouter } from './features/parsing/router';
import './db/init';

export function createServerApp() {
  const app = express();

  app.use(express.json({ limit: '15mb' }));
  app.use('/assets/recipes', express.static('src/assets/recipes'));
  app.get('/api/recipes', getRecipesHandler);
  app.post('/api/recipes', createRecipeHandler);
  app.get('/api/recipes/:id', getRecipeDetailHandler);
  app.delete('/api/recipes/:id', deleteRecipeHandler);
  app.post('/api/uploads/recipe-image', uploadRecipeImageHandler);
  app.use('/api/parsing', parsingRouter);
  app.use((error: unknown, _request: express.Request, response: express.Response, next: express.NextFunction) => {
    if (error instanceof SyntaxError && 'body' in error) {
      response.status(400).json({ message: 'Invalid recipe payload.' });
      return;
    }

    next(error);
  });

  return app;
}

import type { RequestHandler } from 'express';
import { structureXhsRecipe, XhsRecipeStructuringError } from '../services/xhsRecipeStructuring';
import type { StructureXhsRecipeRequestBody } from '../types';

type StructureXhsRecipeHandlerDependencies = {
  structure?: (detail: StructureXhsRecipeRequestBody['detail']) => ReturnType<typeof structureXhsRecipe>;
};

export function createStructureXhsRecipeHandler(
  dependencies: StructureXhsRecipeHandlerDependencies = {},
): RequestHandler {
  const structure = dependencies.structure ?? structureXhsRecipe;

  return async (request, response) => {
    const body = request.body as Partial<StructureXhsRecipeRequestBody> | undefined;

    try {
      const payload = await structure(body?.detail as StructureXhsRecipeRequestBody['detail']);
      response.status(200).json(payload);
    } catch (error) {
      if (error instanceof XhsRecipeStructuringError) {
        response.status(error.statusCode).json({ ok: false, message: error.message, data: null });
        return;
      }

      console.error('Failed to structure XHS recipe detail', error);
      response.status(500).json({ ok: false, message: 'Failed to structure XHS recipe detail.', data: null });
    }
  };
}

export const structureXhsRecipeHandler = createStructureXhsRecipeHandler();

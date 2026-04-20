import type { JSONContent } from '@tiptap/core';
import type { RecipeDetail } from './recipeDetailTypes';

export type CreateRecipeMode = 'parse' | 'manual';

export type ParseStatus = 'idle' | 'loading' | 'success' | 'error';

export type CreateRecipeStatus = 'draft' | 'published';

export type RecipeDraft = {
  title: string;
  coverImageName: string;
  coverImage: string | null;
  category: string;
  tagInput: string;
  tags: string[];
  ingredientsJson: JSONContent;
  ingredientsHtml: string;
  ingredientsText: string;
  stepsJson: JSONContent;
  stepsHtml: string;
  stepsText: string;
};

export type CreateRecipePayload = {
  title: string;
  coverImageName?: string;
  coverImage?: string;
  description: string | null;
  category: string | null;
  tags: string[];
  ingredientsJson: JSONContent | null;
  ingredientsHtml: string | null;
  ingredientsText: string | null;
  stepsJson: JSONContent | null;
  stepsHtml: string | null;
  stepsText: string | null;
  status: CreateRecipeStatus;
};

export type CreateRecipeResponse = RecipeDetail;

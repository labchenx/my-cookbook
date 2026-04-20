import type { JSONContent } from '@tiptap/core';

export type RecipeDetail = {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  category: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  ingredientsJson: JSONContent | null;
  ingredientsHtml: string | null;
  ingredientsText: string | null;
  stepsJson: JSONContent | null;
  stepsHtml: string | null;
  stepsText: string | null;
  sourceUrl: string | null;
  sourceType: 'manual' | 'ai_parse' | null;
  parseStatus: 'none' | 'pending' | 'success' | 'failed';
  status: 'draft' | 'published';
};

export type RecipeDetailStatus = 'loading' | 'error' | 'empty' | 'success';

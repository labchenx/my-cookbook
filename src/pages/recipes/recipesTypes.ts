import { allRecipeTag, fixedRecipeTags, type RecipeFilterTag } from '../../domain/recipeTags';

export type Recipe = {
  id: string;
  title: string;
  description: string;
  coverImage?: string;
  cover?: string;
  tags: string[];
  createdAt: string;
  status: string;
  category?: string;
};

export type RecipeCategory = RecipeFilterTag;

export type SortOrder = 'latest' | 'oldest';

export const recipeCategories: RecipeCategory[] = [allRecipeTag, ...fixedRecipeTags];

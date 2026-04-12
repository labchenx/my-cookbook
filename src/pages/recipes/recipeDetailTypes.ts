export type RecipeDetail = {
  id: string;
  title: string;
  description: string;
  cover: string;
  tags: string[];
  createdAt: string;
  prepTime: string;
  cookTime: string;
  servings: string;
  ingredientsRichText: string;
  stepsRichText: string;
};

export type RecipeDetailStatus = 'loading' | 'error' | 'empty' | 'success';

export type RecipeIngredient = {
  name: string;
  amount: string;
};

export type RecipeStep = {
  id: string;
  order: number;
  text: string;
  image?: string;
};

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
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  tips?: string;
};

export type RecipeDetailStatus = 'loading' | 'error' | 'empty' | 'success';

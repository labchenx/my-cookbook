export type CreateRecipeMode = 'parse' | 'manual';

export type ParseStatus = 'idle' | 'loading' | 'success' | 'error';

export type IngredientItem = {
  id: string;
  name: string;
  amount: string;
};

export type StepItem = {
  id: string;
  description: string;
  imageName: string;
};

export type RecipeDraft = {
  title: string;
  coverImageName: string;
  category: string;
  tagInput: string;
  tags: string[];
  ingredients: IngredientItem[];
  steps: StepItem[];
  tips: string;
};

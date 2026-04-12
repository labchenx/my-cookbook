export type CreateRecipeMode = 'parse' | 'manual';

export type ParseStatus = 'idle' | 'loading' | 'success' | 'error';

export type RecipeDraft = {
  title: string;
  coverImageName: string;
  category: string;
  tagInput: string;
  tags: string[];
  ingredientsRichText: string;
  stepsRichText: string;
};

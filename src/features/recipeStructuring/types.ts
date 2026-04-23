export type RecipeSourceType = 'douyin' | 'xiaohongshu' | 'manual_text';

export type StructuredRecipeDraft = {
  title: string;
  ingredients: string[];
  steps: string[];
  category: string;
  tags: string[];
  imagePrompt: string;
  coverImageName: string | null;
  coverImage: string | null;
  rawText: string;
};

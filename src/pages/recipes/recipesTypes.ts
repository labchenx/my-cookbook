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

export type RecipeCategory =
  | '\u5168\u90e8'
  | '\u5bb6\u5e38\u83dc'
  | '\u751c\u54c1'
  | '\u51cf\u8102'
  | '\u6c64\u7c7b';

export type SortOrder = 'latest' | 'oldest';

export const recipeCategories: RecipeCategory[] = [
  '\u5168\u90e8',
  '\u5bb6\u5e38\u83dc',
  '\u751c\u54c1',
  '\u51cf\u8102',
  '\u6c64\u7c7b',
];

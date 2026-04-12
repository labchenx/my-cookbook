export type Recipe = {
  id: string;
  title: string;
  description: string;
  cover: string;
  tags: string[];
  createdAt: string;
  category: string;
};

export type RecipeCategory = '全部' | '家常菜' | '甜品' | '减脂' | '汤类';
export type SortOrder = 'latest' | 'oldest';

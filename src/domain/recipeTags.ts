export const allRecipeTag = '全部';

export const fixedRecipeTags = [
  '家常菜',
  '甜品',
  '西式',
  '烘焙',
  '减脂',
  '鸡肉',
  '猪肉',
  '牛肉',
] as const;

export const maxRecipeTagCount = 3;
export const defaultRecipeTag = fixedRecipeTags[0];

export type FixedRecipeTag = (typeof fixedRecipeTags)[number];
export type RecipeFilterTag = typeof allRecipeTag | FixedRecipeTag;

const fixedRecipeTagSet = new Set<string>(fixedRecipeTags);

export function isFixedRecipeTag(value: unknown): value is FixedRecipeTag {
  return typeof value === 'string' && fixedRecipeTagSet.has(value);
}

export function normalizeFixedRecipeTags(values: unknown): FixedRecipeTag[] {
  if (!Array.isArray(values)) {
    return [defaultRecipeTag];
  }

  const tags = values
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(isFixedRecipeTag);

  return Array.from(new Set(tags)).slice(0, maxRecipeTagCount);
}

export function normalizeFixedRecipeTagsWithDefault(values: unknown): FixedRecipeTag[] {
  const tags = normalizeFixedRecipeTags(values);

  return tags.length > 0 ? tags : [defaultRecipeTag];
}

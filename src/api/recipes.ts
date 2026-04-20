import type { RequestHandler } from 'express';
import { db } from '../db/sqlite';

export type RecipeListItem = {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  tags: string[];
  createdAt: string;
  status: string;
};

export type RecipeListResponse = {
  items: RecipeListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type RecipeDetailResponse = {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  category: string | null;
  tags: string[];
  ingredientsJson: Record<string, any> | null;
  ingredientsHtml: string | null;
  ingredientsText: string | null;
  stepsJson: Record<string, any> | null;
  stepsHtml: string | null;
  stepsText: string | null;
  sourceUrl: string | null;
  sourceType: 'manual' | 'ai_parse' | null;
  parseStatus: 'none' | 'pending' | 'success' | 'failed';
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
};

export type CreateRecipeRequestBody = {
  title: string;
  coverImageName?: string;
  coverImage?: string;
  description?: string | null;
  category?: string | null;
  tags?: string[];
  ingredientsJson: Record<string, any> | null;
  ingredientsHtml?: string | null;
  ingredientsText?: string | null;
  stepsJson: Record<string, any> | null;
  stepsHtml?: string | null;
  stepsText?: string | null;
  status?: 'draft' | 'published';
};

type RecipeRow = {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  tags: string | null;
  created_at: string;
  status: string;
};

type RecipeDetailRow = {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  category: string | null;
  tags: string | null;
  ingredients_json: string | null;
  ingredients_html: string | null;
  ingredients_text: string | null;
  steps_json: string | null;
  steps_html: string | null;
  steps_text: string | null;
  source_url: string | null;
  source_type: string | null;
  parse_status: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type CountRow = {
  total: number;
};

type RunResult = {
  changes: number | bigint;
  lastInsertRowid: number | bigint;
};

type PreparedStatement<Row> = {
  all: (...params: any[]) => Row[];
  get: (...params: any[]) => Row | undefined;
  run: (...params: any[]) => RunResult;
};

export type DatabaseLike = {
  prepare: (sql: string) => PreparedStatement<any>;
};

export type NormalizedRecipeListQuery = {
  keyword?: string;
  tag?: string;
  sort: 'latest' | 'oldest';
  status: string;
  page: number;
  pageSize: number;
};

type NormalizedCreateRecipeInput = {
  title: string;
  coverImage: string | null;
  description: string | null;
  category: string | null;
  tags: string[];
  ingredientsJson: Record<string, any> | null;
  ingredientsHtml: string | null;
  ingredientsText: string | null;
  stepsJson: Record<string, any> | null;
  stepsHtml: string | null;
  stepsText: string | null;
  status: 'draft' | 'published';
};

class InvalidRecipePayloadError extends Error {
  constructor(message = 'Invalid recipe payload.') {
    super(message);
    this.name = 'InvalidRecipePayloadError';
  }
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 9;
const MAX_PAGE_SIZE = 50;
const DEFAULT_STATUS = 'published';
const DEFAULT_CREATE_STATUS: RecipeDetailResponse['status'] = 'draft';
const DEFAULT_SOURCE_TYPE: RecipeDetailResponse['sourceType'] = 'manual';
const DEFAULT_PARSE_STATUS: RecipeDetailResponse['parseStatus'] = 'none';
const VALID_SOURCE_TYPES = new Set(['manual', 'ai_parse']);
const VALID_PARSE_STATUSES = new Set(['none', 'pending', 'success', 'failed']);
const VALID_RECIPE_STATUSES = new Set(['draft', 'published']);

function getStringValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return getStringValue(value[0]);
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

function parsePositiveInteger(value: unknown, fallbackValue: number): number {
  const stringValue = getStringValue(value);

  if (!stringValue) {
    return fallbackValue;
  }

  const parsedValue = Number.parseInt(stringValue, 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallbackValue;
}

function parseTags(tagsValue: string | null): string[] {
  if (!tagsValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(tagsValue) as unknown;

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter((tag): tag is string => typeof tag === 'string');
  } catch {
    return [];
  }
}

function parseJsonContent(value: string | null): Record<string, any> | null {
  if (!value) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(value) as unknown;

    if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
      return null;
    }

    return parsedValue as Record<string, any>;
  } catch {
    return null;
  }
}

function normalizeSourceType(value: string | null): RecipeDetailResponse['sourceType'] {
  return value && VALID_SOURCE_TYPES.has(value)
    ? (value as RecipeDetailResponse['sourceType'])
    : null;
}

function normalizeParseStatus(value: string): RecipeDetailResponse['parseStatus'] {
  return VALID_PARSE_STATUSES.has(value)
    ? (value as RecipeDetailResponse['parseStatus'])
    : 'none';
}

function normalizeRecipeStatus(value: string): RecipeDetailResponse['status'] {
  return VALID_RECIPE_STATUSES.has(value)
    ? (value as RecipeDetailResponse['status'])
    : 'draft';
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeNullableTextField(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new InvalidRecipePayloadError();
  }

  return value;
}

function normalizeNullableStringField(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new InvalidRecipePayloadError();
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function normalizeTags(value: unknown): string[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value) || value.some((tag) => typeof tag !== 'string')) {
    throw new InvalidRecipePayloadError();
  }

  return value.map((tag) => tag.trim()).filter((tag) => tag.length > 0);
}

function normalizeJsonObjectField(value: unknown): Record<string, any> | null {
  if (value === null) {
    return null;
  }

  if (!isPlainObject(value)) {
    throw new InvalidRecipePayloadError();
  }

  return value;
}

function buildCoverImagePath(coverImage: unknown, coverImageName: unknown): string | null {
  const normalizedCoverImage = getStringValue(coverImage);

  if (normalizedCoverImage) {
    return normalizedCoverImage;
  }

  const normalizedCoverImageName = getStringValue(coverImageName);

  if (!normalizedCoverImageName) {
    return null;
  }

  return `/assets/recipes/${normalizedCoverImageName}`;
}

function normalizeCreateRecipeBody(body: unknown): NormalizedCreateRecipeInput {
  if (!isPlainObject(body)) {
    throw new InvalidRecipePayloadError();
  }

  const title = getStringValue(body.title);

  if (!title) {
    throw new InvalidRecipePayloadError();
  }

  const statusValue = getStringValue(body.status) ?? DEFAULT_CREATE_STATUS;

  if (!VALID_RECIPE_STATUSES.has(statusValue)) {
    throw new InvalidRecipePayloadError();
  }

  return {
    title,
    coverImage: buildCoverImagePath(body.coverImage, body.coverImageName),
    description: normalizeNullableStringField(body.description),
    category: normalizeNullableStringField(body.category),
    tags: normalizeTags(body.tags),
    ingredientsJson: normalizeJsonObjectField(body.ingredientsJson),
    ingredientsHtml: normalizeNullableTextField(body.ingredientsHtml),
    ingredientsText: normalizeNullableTextField(body.ingredientsText),
    stepsJson: normalizeJsonObjectField(body.stepsJson),
    stepsHtml: normalizeNullableTextField(body.stepsHtml),
    stepsText: normalizeNullableTextField(body.stepsText),
    status: statusValue as RecipeDetailResponse['status'],
  };
}

function slugifyRecipeTitle(title: string): string {
  const slug = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return slug || 'recipe';
}

function generateUniqueRecipeId(title: string, database: DatabaseLike): string {
  const baseId = slugifyRecipeTitle(title);
  const existingIdStatement = database.prepare(
    `
      SELECT id
      FROM recipes
      WHERE id = ?
      LIMIT 1
    `,
  );

  let candidateId = baseId;
  let suffix = 2;

  while (existingIdStatement.get(candidateId)) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidateId;
}

export function normalizeRecipeListQuery(
  query: Record<string, unknown> = {},
): NormalizedRecipeListQuery {
  const keyword = getStringValue(query.keyword);
  const tag = getStringValue(query.tag);
  const status = getStringValue(query.status) ?? DEFAULT_STATUS;
  const sort = getStringValue(query.sort) === 'oldest' ? 'oldest' : 'latest';
  const page = parsePositiveInteger(query.page, DEFAULT_PAGE);
  const pageSize = Math.min(parsePositiveInteger(query.pageSize, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);

  return {
    keyword,
    tag,
    sort,
    status,
    page,
    pageSize,
  };
}

export function listRecipes(
  query: Record<string, unknown> = {},
  database: DatabaseLike = db,
): RecipeListResponse {
  const normalizedQuery = normalizeRecipeListQuery(query);
  const whereClauses = ['status = ?'];
  const params: unknown[] = [normalizedQuery.status];

  if (normalizedQuery.keyword) {
    const keywordPattern = `%${normalizedQuery.keyword}%`;
    whereClauses.push('title LIKE ?');
    params.push(keywordPattern);
  }

  if (normalizedQuery.tag) {
    whereClauses.push('tags LIKE ?');
    params.push(`%${normalizedQuery.tag}%`);
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;
  const orderBySql = normalizedQuery.sort === 'oldest' ? 'created_at ASC' : 'created_at DESC';
  const offset = (normalizedQuery.page - 1) * normalizedQuery.pageSize;

  const totalRow = database
    .prepare(`SELECT COUNT(*) AS total FROM recipes ${whereSql}`)
    .get(...params);

  const rows = database
    .prepare(
      `
        SELECT
          id,
          title,
          description,
          cover_image,
          tags,
          created_at,
          status
        FROM recipes
        ${whereSql}
        ORDER BY ${orderBySql}
        LIMIT ? OFFSET ?
      `,
    )
    .all(...params, normalizedQuery.pageSize, offset) as RecipeRow[];
  const total = (totalRow as CountRow).total;

  return {
    items: rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description ?? '',
      coverImage: row.cover_image ?? '',
      tags: parseTags(row.tags),
      createdAt: row.created_at,
      status: row.status,
    })),
    pagination: {
      page: normalizedQuery.page,
      pageSize: normalizedQuery.pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / normalizedQuery.pageSize),
    },
  };
}

export function getRecipeDetail(
  id: string,
  database: DatabaseLike = db,
): RecipeDetailResponse | null {
  const row = database
    .prepare(
      `
        SELECT
          id,
          title,
          description,
          cover_image,
          category,
          tags,
          ingredients_json,
          ingredients_html,
          ingredients_text,
          steps_json,
          steps_html,
          steps_text,
          source_url,
          source_type,
          parse_status,
          status,
          created_at,
          updated_at
        FROM recipes
        WHERE id = ?
        LIMIT 1
      `,
    )
    .get(id) as RecipeDetailRow | undefined;

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    coverImage: row.cover_image,
    category: row.category,
    tags: parseTags(row.tags),
    ingredientsJson: parseJsonContent(row.ingredients_json),
    ingredientsHtml: row.ingredients_html,
    ingredientsText: row.ingredients_text,
    stepsJson: parseJsonContent(row.steps_json),
    stepsHtml: row.steps_html,
    stepsText: row.steps_text,
    sourceUrl: row.source_url,
    sourceType: normalizeSourceType(row.source_type),
    parseStatus: normalizeParseStatus(row.parse_status),
    status: normalizeRecipeStatus(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createRecipe(
  body: unknown,
  database: DatabaseLike = db,
): RecipeDetailResponse {
  const normalizedBody = normalizeCreateRecipeBody(body);
  const id = generateUniqueRecipeId(normalizedBody.title, database);
  const timestamp = new Date().toISOString();

  database
    .prepare(
      `
        INSERT INTO recipes (
          id,
          title,
          description,
          cover_image,
          category,
          tags,
          ingredients_json,
          ingredients_html,
          ingredients_text,
          steps_json,
          steps_html,
          steps_text,
          source_url,
          source_type,
          parse_status,
          status,
          created_at,
          updated_at
        ) VALUES (
          @id,
          @title,
          @description,
          @cover_image,
          @category,
          @tags,
          @ingredients_json,
          @ingredients_html,
          @ingredients_text,
          @steps_json,
          @steps_html,
          @steps_text,
          @source_url,
          @source_type,
          @parse_status,
          @status,
          @created_at,
          @updated_at
        )
      `,
    )
    .run({
      id,
      title: normalizedBody.title,
      description: normalizedBody.description,
      cover_image: normalizedBody.coverImage,
      category: normalizedBody.category,
      tags: JSON.stringify(normalizedBody.tags),
      ingredients_json: JSON.stringify(normalizedBody.ingredientsJson),
      ingredients_html: normalizedBody.ingredientsHtml,
      ingredients_text: normalizedBody.ingredientsText,
      steps_json: JSON.stringify(normalizedBody.stepsJson),
      steps_html: normalizedBody.stepsHtml,
      steps_text: normalizedBody.stepsText,
      source_url: null,
      source_type: DEFAULT_SOURCE_TYPE,
      parse_status: DEFAULT_PARSE_STATUS,
      status: normalizedBody.status,
      created_at: timestamp,
      updated_at: timestamp,
    });

  const recipe = getRecipeDetail(id, database);

  if (!recipe) {
    throw new Error('Failed to create recipe.');
  }

  return recipe;
}

export function deleteRecipe(
  id: string,
  database: DatabaseLike = db,
): boolean {
  const result = database
    .prepare(
      `
        DELETE FROM recipes
        WHERE id = ?
      `,
    )
    .run(id);

  return Number(result.changes) > 0;
}

export const getRecipesHandler: RequestHandler = (request, response) => {
  try {
    response.json(listRecipes(request.query as Record<string, unknown>));
  } catch (error) {
    console.error('Failed to load recipes', error);
    response.status(500).json({ message: 'Failed to load recipes.' });
  }
};

export const getRecipeDetailHandler: RequestHandler = (request, response) => {
  try {
    const recipeId = getStringValue(request.params.id) ?? '';
    const recipe = getRecipeDetail(recipeId);

    if (!recipe) {
      response.status(404).json({ message: 'Recipe not found.' });
      return;
    }

    response.json(recipe);
  } catch (error) {
    console.error('Failed to load recipe detail', error);
    response.status(500).json({ message: 'Failed to load recipe detail.' });
  }
};

export const createRecipeHandler: RequestHandler = (request, response) => {
  try {
    const recipe = createRecipe(request.body);
    response.status(201).json(recipe);
  } catch (error) {
    if (error instanceof InvalidRecipePayloadError) {
      response.status(400).json({ message: error.message });
      return;
    }

    console.error('Failed to create recipe', error);
    response.status(500).json({ message: 'Failed to create recipe.' });
  }
};

export const deleteRecipeHandler: RequestHandler = (request, response) => {
  try {
    const recipeId = getStringValue(request.params.id) ?? '';
    const deleted = deleteRecipe(recipeId);

    if (!deleted) {
      response.status(404).json({ message: 'Recipe not found.' });
      return;
    }

    response.status(200).json({ success: true });
  } catch (error) {
    console.error('Failed to delete recipe', error);
    response.status(500).json({ message: 'Failed to delete recipe.' });
  }
};

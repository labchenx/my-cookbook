import { createRecipe, deleteRecipe, getRecipeDetail, listRecipes, normalizeRecipeListQuery, type DatabaseLike } from './recipes';

type MockDatabaseOptions = {
  total?: number;
  rows?: Array<Record<string, unknown>>;
  detailRow?: Record<string, unknown>;
  detailRowsById?: Record<string, Record<string, unknown>>;
};

function createMockDatabase({
  total = 0,
  rows = [],
  detailRow,
  detailRowsById = {},
}: MockDatabaseOptions = {}): DatabaseLike & {
  prepareCalls: string[];
  countParams: unknown[];
  listParams: unknown[];
  detailParams: unknown[];
  idLookupParams: unknown[];
  deleteParams: unknown[];
  insertParams: Array<Record<string, unknown>>;
} {
  const prepareCalls: string[] = [];
  const countParams: unknown[] = [];
  const listParams: unknown[] = [];
  const detailParams: unknown[] = [];
  const idLookupParams: unknown[] = [];
  const deleteParams: unknown[] = [];
  const insertParams: Array<Record<string, unknown>> = [];
  const storedDetailRows = new Map<string, Record<string, unknown>>();

  if (detailRow && typeof detailRow.id === 'string') {
    storedDetailRows.set(detailRow.id, detailRow);
  }

  for (const [id, row] of Object.entries(detailRowsById)) {
    storedDetailRows.set(id, row);
  }

  const emptyStatement = {
    all: () => [],
    get: () => undefined,
    run: () => ({ changes: 0, lastInsertRowid: 0 }),
  };

  return {
    prepareCalls,
    countParams,
    listParams,
    detailParams,
    idLookupParams,
    deleteParams,
    insertParams,
    prepare(sql: string) {
      prepareCalls.push(sql);

      if (sql.includes('COUNT(*)')) {
        return {
          all: () => [],
          get: (...params: unknown[]) => {
            countParams.push(...params);
            return { total };
          },
          run: () => ({ changes: 0, lastInsertRowid: 0 }),
        };
      }

      if (sql.includes('SELECT id') && sql.includes('WHERE id = ?')) {
        return {
          all: () => [],
          get: (...params: unknown[]) => {
            idLookupParams.push(...params);
            const id = params[0];
            return typeof id === 'string' && storedDetailRows.has(id) ? { id } : undefined;
          },
          run: () => ({ changes: 0, lastInsertRowid: 0 }),
        };
      }

      if (sql.includes('INSERT INTO recipes')) {
        return {
          all: () => [],
          get: () => undefined,
          run: (...params: unknown[]) => {
            const input = params[0] as Record<string, unknown>;
            insertParams.push(input);
            storedDetailRows.set(String(input.id), {
              id: input.id,
              title: input.title,
              description: input.description ?? null,
              cover_image: input.cover_image ?? null,
              category: input.category ?? null,
              tags: input.tags ?? null,
              ingredients_json: input.ingredients_json ?? null,
              ingredients_html: input.ingredients_html ?? null,
              ingredients_text: input.ingredients_text ?? null,
              steps_json: input.steps_json ?? null,
              steps_html: input.steps_html ?? null,
              steps_text: input.steps_text ?? null,
              source_url: input.source_url ?? null,
              source_type: input.source_type ?? null,
              parse_status: input.parse_status ?? 'none',
              status: input.status ?? 'draft',
              created_at: input.created_at,
              updated_at: input.updated_at,
            });
            return { changes: 1, lastInsertRowid: insertParams.length };
          },
        };
      }

      if (sql.includes('DELETE FROM recipes')) {
        return {
          all: () => [],
          get: () => undefined,
          run: (...params: unknown[]) => {
            deleteParams.push(...params);
            const id = params[0];

            if (typeof id !== 'string' || !storedDetailRows.has(id)) {
              return { changes: 0, lastInsertRowid: 0 };
            }

            storedDetailRows.delete(id);
            return { changes: 1, lastInsertRowid: 0 };
          },
        };
      }

      if (sql.includes('WHERE id = ?')) {
        return {
          all: () => [],
          get: (...params: unknown[]) => {
            detailParams.push(...params);
            const id = params[0];
            return typeof id === 'string' ? storedDetailRows.get(id) : undefined;
          },
          run: () => ({ changes: 0, lastInsertRowid: 0 }),
        };
      }

      return {
        ...emptyStatement,
        all: (...params: unknown[]) => {
          listParams.push(...params);
          return rows;
        },
        get: () => ({ total }),
      };
    },
  };
}

describe('normalizeRecipeListQuery', () => {
  it('applies defaults and fallbacks', () => {
    expect(normalizeRecipeListQuery({})).toEqual({
      keyword: undefined,
      tag: undefined,
      sort: 'latest',
      status: 'published',
      page: 1,
      pageSize: 9,
    });

    expect(
      normalizeRecipeListQuery({
        sort: 'bad-value',
        page: '0',
        pageSize: '999',
        status: '',
      }),
    ).toEqual({
      keyword: undefined,
      tag: undefined,
      sort: 'latest',
      status: 'published',
      page: 1,
      pageSize: 50,
    });
  });
});

describe('listRecipes', () => {
  it('returns camelCase items and pagination metadata', () => {
    const database = createMockDatabase({
      total: 1,
      rows: [
        {
          id: 'chocolate-mousse-cake',
          title: 'Chocolate Mousse Cake',
          description: 'Silky chocolate mousse with a smooth finish.',
          cover_image: '/assets/recipes/cover-chocolate-mousse.png',
          tags: '["dessert","easy"]',
          created_at: '2026-04-12T10:00:00+08:00',
          status: 'published',
          ingredients_json: '{"type":"doc"}',
          steps_json: '{"type":"doc"}',
        },
      ],
    });

    const result = listRecipes({}, database);

    expect(result).toEqual({
      items: [
        {
          id: 'chocolate-mousse-cake',
          title: 'Chocolate Mousse Cake',
          description: 'Silky chocolate mousse with a smooth finish.',
          coverImage: '/assets/recipes/cover-chocolate-mousse.png',
          tags: ['dessert', 'easy'],
          createdAt: '2026-04-12T10:00:00+08:00',
          status: 'published',
        },
      ],
      pagination: {
        page: 1,
        pageSize: 9,
        total: 1,
        totalPages: 1,
      },
    });
    expect(result.items[0]).not.toHaveProperty('ingredients');
    expect(result.items[0]).not.toHaveProperty('steps');
    expect(database.countParams).toEqual(['published']);
    expect(database.listParams).toEqual(['published', 9, 0]);
    expect(database.prepareCalls[1]).toContain('ORDER BY created_at DESC');
  });

  it('supports keyword, tag, explicit status, oldest sort and pagination offset', () => {
    const database = createMockDatabase({
      total: 12,
      rows: [
        {
          id: 'draft-matcha-pudding',
          title: 'Matcha Pudding',
          description: null,
          cover_image: null,
          tags: 'not-json',
          created_at: '2026-04-13T08:30:00+08:00',
          status: 'draft',
        },
      ],
    });

    const result = listRecipes(
      {
        keyword: 'Matcha',
        tag: 'dessert',
        status: 'draft',
        sort: 'oldest',
        page: '2',
        pageSize: '5',
      },
      database,
    );

    expect(result.pagination).toEqual({
      page: 2,
      pageSize: 5,
      total: 12,
      totalPages: 3,
    });
    expect(result.items[0]).toEqual({
      id: 'draft-matcha-pudding',
      title: 'Matcha Pudding',
      description: '',
      coverImage: '',
      tags: [],
      createdAt: '2026-04-13T08:30:00+08:00',
      status: 'draft',
    });
    expect(database.countParams).toEqual(['draft', '%Matcha%', '%dessert%']);
    expect(database.listParams).toEqual(['draft', '%Matcha%', '%dessert%', 5, 5]);
    expect(database.prepareCalls[0]).toContain('status = ?');
    expect(database.prepareCalls[0]).toContain('title LIKE ?');
    expect(database.prepareCalls[0]).not.toContain('content_text');
    expect(database.prepareCalls[0]).toContain('tags LIKE ?');
    expect(database.prepareCalls[1]).toContain('ORDER BY created_at ASC');
  });

  it('supports multi-page results and last-page pagination', () => {
    const database = createMockDatabase({
      total: 36,
      rows: Array.from({ length: 9 }, (_, index) => ({
        id: `recipe-${index + 10}`,
        title: `Recipe ${index + 10}`,
        description: `Description ${index + 10}`,
        cover_image: `/assets/recipes/recipe-${index + 10}.png`,
        tags: '["family"]',
        created_at: `2026-03-${String(index + 1).padStart(2, '0')}T09:00:00+08:00`,
        status: 'published',
      })),
    });

    const pageTwoResult = listRecipes({ page: '2', pageSize: '9' }, database);

    expect(pageTwoResult.pagination).toEqual({
      page: 2,
      pageSize: 9,
      total: 36,
      totalPages: 4,
    });
    expect(database.listParams).toEqual(['published', 9, 9]);

    const lastPageDatabase = createMockDatabase({
      total: 36,
      rows: Array.from({ length: 9 }, (_, index) => ({
        id: `recipe-${index + 28}`,
        title: `Recipe ${index + 28}`,
        description: `Description ${index + 28}`,
        cover_image: `/assets/recipes/recipe-${index + 28}.png`,
        tags: '["light"]',
        created_at: `2026-02-${String(index + 1).padStart(2, '0')}T09:00:00+08:00`,
        status: 'published',
      })),
    });

    const lastPageResult = listRecipes({ page: '4', pageSize: '9' }, lastPageDatabase);

    expect(lastPageResult.pagination).toEqual({
      page: 4,
      pageSize: 9,
      total: 36,
      totalPages: 4,
    });
    expect(lastPageDatabase.listParams).toEqual(['published', 9, 27]);
  });

  it('recalculates total pages after filtering', () => {
    const database = createMockDatabase({
      total: 11,
      rows: Array.from({ length: 9 }, (_, index) => ({
        id: `soup-${index + 1}`,
        title: `Soup ${index + 1}`,
        description: 'Warm soup',
        cover_image: `/assets/recipes/soup-${index + 1}.png`,
        tags: '["soup","nutrition"]',
        created_at: `2026-03-${String(index + 10).padStart(2, '0')}T09:00:00+08:00`,
        status: 'published',
      })),
    });

    const result = listRecipes({ tag: 'soup', page: '1', pageSize: '9' }, database);

    expect(result.pagination).toEqual({
      page: 1,
      pageSize: 9,
      total: 11,
      totalPages: 2,
    });
    expect(database.countParams).toEqual(['published', '%soup%']);
  });

  it('returns empty results with zero total pages when no rows match', () => {
    const database = createMockDatabase();

    expect(listRecipes({ page: '3' }, database)).toEqual({
      items: [],
      pagination: {
        page: 3,
        pageSize: 9,
        total: 0,
        totalPages: 0,
      },
    });
  });
});

describe('getRecipeDetail', () => {
  it('returns a full camelCase recipe detail response', () => {
    const database = createMockDatabase({
      detailRow: {
        id: 'chocolate-mousse-cake',
        title: 'Chocolate Mousse Cake',
        description: 'Silky chocolate mousse with a smooth finish.',
        cover_image: '/assets/recipes/cover-chocolate-mousse.png',
        category: 'dessert',
        tags: '["dessert","easy"]',
        ingredients_json: '{"type":"doc","content":[]}',
        ingredients_html: '<ul><li>Dark chocolate - 200g</li></ul>',
        ingredients_text: 'Dark chocolate - 200g',
        steps_json: '{"type":"doc","content":[{"type":"paragraph"}]}',
        steps_html: '<ol><li>Melt the chocolate.</li></ol>',
        steps_text: 'Melt the chocolate.',
        source_url: 'https://example.com/recipes/chocolate-mousse-cake',
        source_type: 'manual',
        parse_status: 'success',
        status: 'published',
        created_at: '2026-04-12T10:00:00+08:00',
        updated_at: '2026-04-12T12:00:00+08:00',
      },
    });

    expect(getRecipeDetail('chocolate-mousse-cake', database)).toEqual({
      id: 'chocolate-mousse-cake',
      title: 'Chocolate Mousse Cake',
      description: 'Silky chocolate mousse with a smooth finish.',
      coverImage: '/assets/recipes/cover-chocolate-mousse.png',
      category: 'dessert',
      tags: ['dessert', 'easy'],
      ingredientsJson: { type: 'doc', content: [] },
      ingredientsHtml: '<ul><li>Dark chocolate - 200g</li></ul>',
      ingredientsText: 'Dark chocolate - 200g',
      stepsJson: { type: 'doc', content: [{ type: 'paragraph' }] },
      stepsHtml: '<ol><li>Melt the chocolate.</li></ol>',
      stepsText: 'Melt the chocolate.',
      sourceUrl: 'https://example.com/recipes/chocolate-mousse-cake',
      sourceType: 'manual',
      parseStatus: 'success',
      status: 'published',
      createdAt: '2026-04-12T10:00:00+08:00',
      updatedAt: '2026-04-12T12:00:00+08:00',
    });
    expect(database.prepareCalls[0]).toContain('WHERE id = ?');
    expect(database.prepareCalls[0]).toContain('LIMIT 1');
    expect(database.detailParams).toEqual(['chocolate-mousse-cake']);
  });

  it('returns reasonable defaults for empty or invalid serialized fields', () => {
    const database = createMockDatabase({
      detailRow: {
        id: 'draft-matcha-pudding',
        title: 'Matcha Pudding',
        description: null,
        cover_image: null,
        category: null,
        tags: 'not-json',
        ingredients_json: '',
        ingredients_html: null,
        ingredients_text: null,
        steps_json: '["not-an-object"]',
        steps_html: null,
        steps_text: null,
        source_url: null,
        source_type: null,
        parse_status: 'none',
        status: 'draft',
        created_at: '2026-04-13T08:30:00+08:00',
        updated_at: '2026-04-13T09:30:00+08:00',
      },
    });

    expect(getRecipeDetail('draft-matcha-pudding', database)).toEqual({
      id: 'draft-matcha-pudding',
      title: 'Matcha Pudding',
      description: null,
      coverImage: null,
      category: null,
      tags: [],
      ingredientsJson: null,
      ingredientsHtml: null,
      ingredientsText: null,
      stepsJson: null,
      stepsHtml: null,
      stepsText: null,
      sourceUrl: null,
      sourceType: null,
      parseStatus: 'none',
      status: 'draft',
      createdAt: '2026-04-13T08:30:00+08:00',
      updatedAt: '2026-04-13T09:30:00+08:00',
    });
  });

  it('falls back when enum-like database fields contain unexpected values', () => {
    const database = createMockDatabase({
      detailRow: {
        id: 'recipe-with-dirty-data',
        title: 'Recipe With Dirty Data',
        description: null,
        cover_image: null,
        category: null,
        tags: null,
        ingredients_json: null,
        ingredients_html: null,
        ingredients_text: null,
        steps_json: '{"type":"doc"}',
        steps_html: null,
        steps_text: null,
        source_url: null,
        source_type: 'external_import',
        parse_status: 'queued',
        status: 'archived',
        created_at: '2026-04-14T08:30:00+08:00',
        updated_at: '2026-04-14T09:30:00+08:00',
      },
    });

    expect(getRecipeDetail('recipe-with-dirty-data', database)).toEqual(
      expect.objectContaining({
        sourceType: null,
        parseStatus: 'none',
        status: 'draft',
        stepsJson: { type: 'doc' },
      }),
    );
  });

  it('returns null when no matching recipe is found', () => {
    const database = createMockDatabase();

    expect(getRecipeDetail('missing-recipe', database)).toBeNull();
    expect(database.detailParams).toEqual(['missing-recipe']);
  });
});

describe('createRecipe', () => {
  it('creates a draft recipe and returns the mapped detail response', () => {
    const database = createMockDatabase();

    const result = createRecipe(
      {
        title: 'Tomato Pasta',
        coverImageName: 'cover-salad.png',
        tags: ['easy', ' dinner '],
        ingredientsJson: { type: 'doc', content: [] },
        ingredientsHtml: '<ul><li>Tomato - 2</li></ul>',
        ingredientsText: 'Tomato - 2',
        stepsJson: { type: 'doc', content: [{ type: 'paragraph' }] },
        stepsHtml: '<ol><li>Cook pasta.</li></ol>',
        stepsText: 'Cook pasta.',
      },
      database,
    );

    expect(result).toEqual(
      expect.objectContaining({
        id: 'tomato-pasta',
        title: 'Tomato Pasta',
        description: null,
        coverImage: '/assets/recipes/cover-salad.png',
        category: null,
        tags: ['easy', 'dinner'],
        ingredientsJson: { type: 'doc', content: [] },
        ingredientsHtml: '<ul><li>Tomato - 2</li></ul>',
        ingredientsText: 'Tomato - 2',
        stepsJson: { type: 'doc', content: [{ type: 'paragraph' }] },
        stepsHtml: '<ol><li>Cook pasta.</li></ol>',
        stepsText: 'Cook pasta.',
        sourceUrl: null,
        sourceType: 'manual',
        parseStatus: 'none',
        status: 'draft',
      }),
    );
    expect(database.insertParams).toHaveLength(1);
    expect(database.insertParams[0]).toEqual(
      expect.objectContaining({
        id: 'tomato-pasta',
        cover_image: '/assets/recipes/cover-salad.png',
        tags: '["easy","dinner"]',
        ingredients_json: '{"type":"doc","content":[]}',
        steps_json: '{"type":"doc","content":[{"type":"paragraph"}]}',
        source_type: 'manual',
        parse_status: 'none',
        status: 'draft',
      }),
    );
    expect(result.createdAt).toBe(result.updatedAt);
  });

  it('prefers explicit coverImage and preserves published status', () => {
    const database = createMockDatabase();

    const result = createRecipe(
      {
        title: 'Sheet Pan Fish',
        coverImage: 'https://cdn.example.com/fish.png',
        coverImageName: 'ignored.png',
        category: 'Dinner',
        description: 'Simple baked fish.',
        tags: ['published'],
        ingredientsJson: { type: 'doc' },
        ingredientsHtml: '',
        ingredientsText: '',
        stepsJson: { type: 'doc' },
        stepsHtml: '',
        stepsText: '',
        status: 'published',
      },
      database,
    );

    expect(result.coverImage).toBe('https://cdn.example.com/fish.png');
    expect(result.status).toBe('published');
    expect(database.insertParams[0]).toEqual(
      expect.objectContaining({
        cover_image: 'https://cdn.example.com/fish.png',
        status: 'published',
      }),
    );
  });

  it('adds an incrementing suffix when the title slug already exists', () => {
    const database = createMockDatabase({
      detailRowsById: {
        'weeknight-pasta': { id: 'weeknight-pasta' },
        'weeknight-pasta-2': { id: 'weeknight-pasta-2' },
      },
    });

    const result = createRecipe(
      {
        title: 'Weeknight Pasta',
        ingredientsJson: { type: 'doc' },
        stepsJson: { type: 'doc' },
      },
      database,
    );

    expect(result.id).toBe('weeknight-pasta-3');
    expect(database.idLookupParams).toEqual(['weeknight-pasta', 'weeknight-pasta-2', 'weeknight-pasta-3']);
    expect(database.insertParams[0]).toEqual(expect.objectContaining({ id: 'weeknight-pasta-3' }));
  });

  it('rejects missing title without writing to the database', () => {
    const database = createMockDatabase();

    expect(() =>
      createRecipe(
        {
          title: '   ',
          ingredientsJson: { type: 'doc' },
          stepsJson: { type: 'doc' },
        },
        database,
      ),
    ).toThrow('Invalid recipe payload.');
    expect(database.insertParams).toEqual([]);
  });

  it('rejects non-string tag arrays', () => {
    const database = createMockDatabase();

    expect(() =>
      createRecipe(
        {
          title: 'Tag Failure',
          tags: ['valid', 123],
          ingredientsJson: { type: 'doc' },
          stepsJson: { type: 'doc' },
        },
        database,
      ),
    ).toThrow('Invalid recipe payload.');
    expect(database.insertParams).toEqual([]);
  });

  it('rejects invalid json content payloads', () => {
    const database = createMockDatabase();

    expect(() =>
      createRecipe(
        {
          title: 'Bad JSON',
          ingredientsJson: ['not-an-object'],
          stepsJson: { type: 'doc' },
        },
        database,
      ),
    ).toThrow('Invalid recipe payload.');

    expect(() =>
      createRecipe(
        {
          title: 'Bad Steps',
          ingredientsJson: { type: 'doc' },
          stepsJson: 'nope',
        },
        database,
      ),
    ).toThrow('Invalid recipe payload.');
    expect(database.insertParams).toEqual([]);
  });

  it('rejects invalid status values', () => {
    const database = createMockDatabase();

    expect(() =>
      createRecipe(
        {
          title: 'Archived Recipe',
          ingredientsJson: { type: 'doc' },
          stepsJson: { type: 'doc' },
          status: 'archived',
        },
        database,
      ),
    ).toThrow('Invalid recipe payload.');
    expect(database.insertParams).toEqual([]);
  });
});

describe('deleteRecipe', () => {
  it('returns true when a recipe is deleted successfully', () => {
    const database = createMockDatabase({
      detailRowsById: {
        'tomato-pasta': { id: 'tomato-pasta' },
      },
    });

    expect(deleteRecipe('tomato-pasta', database)).toBe(true);
    expect(database.prepareCalls.some((sql) => sql.includes('DELETE FROM recipes'))).toBe(true);
    expect(database.prepareCalls.some((sql) => sql.includes('WHERE id = ?'))).toBe(true);
    expect(database.deleteParams).toEqual(['tomato-pasta']);
  });

  it('returns false when the recipe does not exist', () => {
    const database = createMockDatabase();

    expect(deleteRecipe('missing-recipe', database)).toBe(false);
    expect(database.deleteParams).toEqual(['missing-recipe']);
  });
});

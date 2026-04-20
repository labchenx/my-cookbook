import { db } from './sqlite';

type TableInfoRow = {
  name: string;
};

const recipeColumns = [
  'id',
  'title',
  'description',
  'cover_image',
  'category',
  'tags',
  'ingredients_json',
  'ingredients_html',
  'ingredients_text',
  'steps_json',
  'steps_html',
  'steps_text',
  'source_url',
  'source_type',
  'parse_status',
  'status',
  'created_at',
  'updated_at',
];

const copyableColumns = [
  'id',
  'title',
  'description',
  'cover_image',
  'category',
  'tags',
  'source_url',
  'source_type',
  'parse_status',
  'status',
  'created_at',
  'updated_at',
];

function createRecipesTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY,

      title TEXT NOT NULL,
      description TEXT,

      cover_image TEXT,

      category TEXT,
      tags TEXT,

      ingredients_json TEXT,
      ingredients_html TEXT,
      ingredients_text TEXT,

      steps_json TEXT,
      steps_html TEXT,
      steps_text TEXT,

      source_url TEXT,
      source_type TEXT,
      parse_status TEXT NOT NULL DEFAULT 'none',

      status TEXT NOT NULL DEFAULT 'draft',

      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_recipes_status ON recipes(status);
    CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);
  `);
}

function getTableColumns(tableName: string) {
  return (db.prepare(`PRAGMA table_info(${tableName})`).all() as TableInfoRow[]).map((row) => row.name);
}

function ensureRecipesTableShape() {
  const currentColumns = getTableColumns('recipes');

  if (currentColumns.length === 0) {
    createRecipesTable();
    return;
  }

  const matchesShape =
    currentColumns.length === recipeColumns.length &&
    recipeColumns.every((column) => currentColumns.includes(column));

  if (matchesShape) {
    createRecipesTable();
    return;
  }

  db.exec('DROP TABLE IF EXISTS recipes_legacy;');
  db.exec('ALTER TABLE recipes RENAME TO recipes_legacy;');
  createRecipesTable();

  const legacyColumns = getTableColumns('recipes_legacy');
  const sharedColumns = copyableColumns.filter((column) => legacyColumns.includes(column));

  if (sharedColumns.length > 0) {
    const insertColumns = [
      ...sharedColumns,
      'ingredients_json',
      'ingredients_html',
      'ingredients_text',
      'steps_json',
      'steps_html',
      'steps_text',
    ];
    const selectColumns = [
      ...sharedColumns,
      'NULL AS ingredients_json',
      'NULL AS ingredients_html',
      'NULL AS ingredients_text',
      'NULL AS steps_json',
      'NULL AS steps_html',
      'NULL AS steps_text',
    ];

    db.exec(`
      INSERT INTO recipes (${insertColumns.join(', ')})
      SELECT ${selectColumns.join(', ')}
      FROM recipes_legacy
    `);
  }

  db.exec('DROP TABLE recipes_legacy;');
}

export function initDatabase(): void {
  ensureRecipesTableShape();
}

initDatabase();

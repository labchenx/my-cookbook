import { db } from './sqlite';

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY,

      title TEXT NOT NULL,
      description TEXT,

      cover_image TEXT,

      category TEXT,
      tags TEXT,

      ingredients TEXT,
      content TEXT,
      content_text TEXT,

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

initDatabase();

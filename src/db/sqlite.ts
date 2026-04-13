import Database from 'better-sqlite3';

const db: Database.Database = new Database('data.db');

db.pragma('foreign_keys = ON');

export { db };

// src/db/client.ts
import * as SQLite from "expo-sqlite";
import { MIGRATIONS } from "./schema";

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb() {
  if (db) return db;

  db = await SQLite.openDatabaseAsync("gider.sqlite");

  await db.execAsync("PRAGMA journal_mode = WAL;");
  await db.execAsync("PRAGMA foreign_keys = ON;");

  await migrate(db);
  await seed(db);

  return db;
}

async function migrate(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      run_at TEXT NOT NULL
    );
  `);

  const applied = await db.getAllAsync<{ id: number }>(
    "SELECT id FROM _migrations ORDER BY id ASC;"
  );
  const appliedIds = new Set(applied.map((m) => m.id));

  for (const migration of MIGRATIONS) {
    if (appliedIds.has(migration.id)) continue;

    for (const stmt of migration.statements) {
      await db.execAsync(stmt);
    }

    await db.runAsync(
      `INSERT INTO _migrations (id, name, run_at) VALUES (?,?,?);`,
      [migration.id, migration.name, new Date().toISOString()]
    );
  }
}

async function seed(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    INSERT OR IGNORE INTO accounts (id, name, currency, initial_balance)
    VALUES ('acc-default', 'Nakit', 'TRY', 0);
  `);

  await db.execAsync(`
    INSERT OR IGNORE INTO categories (id, name, type, icon)
    VALUES
      ('cat-market', 'Market', 'expense', 'cart'),
      ('cat-yemek', 'Yemek', 'expense', 'utensils'),
      ('cat-maas', 'Maaş', 'income', 'wallet');
  `);
}

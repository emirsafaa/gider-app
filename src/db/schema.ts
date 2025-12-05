// src/db/schema.ts
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TRY',
  initial_balance INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('expense','income')),
  icon TEXT
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  category_id TEXT,
  amount INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  note TEXT,
  tx_date TEXT NOT NULL,
  tx_date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(account_id) REFERENCES accounts(id),
  FOREIGN KEY(category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  month TEXT NOT NULL,                  -- YYYY-MM
  month TEXT NOT NULL,                  -- YYYY-MM
  category_id TEXT NOT NULL,
  limit_amount INTEGER NOT NULL,
  FOREIGN KEY(category_id) REFERENCES categories(id),
  UNIQUE(month, category_id)
);

CREATE TABLE IF NOT EXISTS recurring_transactions (
  id TEXT PRIMARY KEY,
  amount INTEGER NOT NULL,
  category_id TEXT,
  account_id TEXT NOT NULL,
  note TEXT,
  frequency TEXT NOT NULL DEFAULT 'monthly', -- Şimdilik sadece 'monthly' destekleyelim
  next_due_date TEXT NOT NULL,               -- YYYY-MM-DD
  FOREIGN KEY(account_id) REFERENCES accounts(id),
  FOREIGN KEY(category_id) REFERENCES categories(id)
);
`;
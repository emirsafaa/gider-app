// src/db/schema.ts

export type Migration = {
  id: number;
  name: string;
  statements: string[];
};

// İlk versiyon: tablolar, foreign key kuralları ve indeksler
export const MIGRATIONS: Migration[] = [
  {
    id: 1,
    name: "initial-schema",
    statements: [
      `CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        currency TEXT NOT NULL DEFAULT 'TRY',
        initial_balance INTEGER NOT NULL DEFAULT 0
      );`,
      "CREATE INDEX IF NOT EXISTS idx_accounts_name ON accounts(name);",
      `CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('expense','income')),
        icon TEXT
      );`,
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_type ON categories(name, type);",
      `CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        category_id TEXT,
        amount INTEGER NOT NULL,
        note TEXT,
        tx_date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE
      );`,
      "CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(tx_date);",
      "CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);",
      "CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);",
      `CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        month TEXT NOT NULL,
        category_id TEXT NOT NULL,
        limit_amount INTEGER NOT NULL,
        FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE ON UPDATE CASCADE,
        UNIQUE(month, category_id)
      );`,
      "CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(month);",
    ],
  },
];

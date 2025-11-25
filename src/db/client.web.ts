// src/db/client.web.ts
// Web için SQLite yerine in-memory veri katmanı
// Mobil ile parity sağlamak için basit CRUD ve kısıtlamalar taklit edilir.

import { MIGRATIONS } from "./schema";

export type AccountRow = {
  id: string;
  name: string;
  currency: string;
  initial_balance: number;
};

export type CategoryRow = {
  id: string;
  name: string;
  type: "expense" | "income";
  icon: string | null;
};

export type BudgetRow = {
  id: string;
  month: string;
  category_id: string;
  limit_amount: number;
};

export type Tx = {
  id: string;
  account_id: string;
  category_id?: string | null;
  amount: number;
  note?: string | null;
  tx_date: string;
  created_at: string;
  updated_at: string;
  category_name?: string | null;
};

let migrationsApplied = false;
let accounts: AccountRow[] = [];
let categories: CategoryRow[] = [];
let budgets: BudgetRow[] = [];
let transactions: Tx[] = [];

async function ensureInitialized() {
  if (migrationsApplied) return;

  // migrations
  for (const migration of MIGRATIONS) {
    if (migration.id === 1) {
      // initial schema → sadece bellek yapıları hazırlanıyor
      accounts = [
        { id: "acc-default", name: "Nakit", currency: "TRY", initial_balance: 0 },
      ];
      categories = [
        { id: "cat-market", name: "Market", type: "expense", icon: "cart" },
        { id: "cat-yemek", name: "Yemek", type: "expense", icon: "utensils" },
        { id: "cat-maas", name: "Maaş", type: "income", icon: "wallet" },
      ];
    }
  }

  migrationsApplied = true;
}

// ----------------------------------------------------
// Helpers
// ----------------------------------------------------
function refreshCategoryNames(tx: Tx[]): Tx[] {
  return tx.map((t) => ({
    ...t,
    category_name: categories.find((c) => c.id === t.category_id)?.name ?? null,
  }));
}

// ----------------------------------------------------
// Web-compatible SQLite-like functions
// ----------------------------------------------------
async function execAsync(_sql: string) {
  return;
}

async function runAsync(sql: string, params: any[] = []) {
  await ensureInitialized();

  if (sql.startsWith("INSERT INTO transactions")) {
    const [id, account_id, category_id, amount, note, tx_date, created_at, updated_at] =
      params;

    transactions.unshift({
      id,
      account_id,
      category_id,
      amount,
      note,
      tx_date,
      created_at,
      updated_at,
    });
  }

  if (sql.startsWith("INSERT INTO categories")) {
    const [id, name, type] = params;
    categories.push({ id, name, type, icon: null });
  }

  if (sql.startsWith("DELETE FROM categories")) {
    const [id] = params;
    await deleteCategory(id);
  }

  if (sql.startsWith("INSERT INTO budgets")) {
    const [month, category_id, limit_amount] = params;
    const existing = budgets.find((b) => b.month === month && b.category_id === category_id);

    if (existing) {
      existing.limit_amount = limit_amount;
      return;
    }

    budgets.push({
      id: "b-" + Math.random().toString(36).slice(2, 10),
      month,
      category_id,
      limit_amount,
    });
  }

  if (sql.startsWith("INSERT INTO _migrations")) {
    // ignore on web
    return;
  }
}

async function getAllAsync(sql: string, params: any[] = []): Promise<any[]> {
  await ensureInitialized();

  if (sql.includes("FROM transactions")) {
    const filtered = (sql.includes("strftime('%Y-%m', t.tx_date)=?")
      ? transactions.filter((t) => t.tx_date.startsWith(params[0]))
      : transactions
    ).sort((a, b) => {
      const dateDiff = b.tx_date.localeCompare(a.tx_date);
      if (dateDiff !== 0) return dateDiff;
      return b.created_at.localeCompare(a.created_at);
    });

    return refreshCategoryNames(filtered);
  }

  if (sql.includes("FROM budgets")) {
    if (sql.includes("WHERE month=?")) {
      const month = params[0];
      return budgets.filter((b) => b.month === month);
    }
    return budgets;
  }

  if (sql.includes("FROM categories")) {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name));
  }

  if (sql.includes("FROM _migrations")) {
    return []; // web tarafında boş
  }

  return [];
}

async function getFirstAsync<T extends Record<string, any>>(
  sql: string,
  params: any[] = []
): Promise<T | null> {
  await ensureInitialized();

  if (sql.includes("SUM") && sql.includes("FROM transactions")) {
    const [category_id, month] = params;
    const total = transactions
      .filter((t) => t.amount < 0)
      .filter((t) => (!category_id ? true : t.category_id === category_id))
      .filter((t) => (!month ? true : t.tx_date.startsWith(month)))
      .reduce((acc, t) => acc + Math.abs(t.amount), 0);

    return { total } as T;
  }

  if (
    sql.includes("CASE WHEN amount > 0") &&
    sql.includes("CASE WHEN amount < 0") &&
    params[0]
  ) {
    const month = params[0];
    const income = transactions
      .filter((t) => t.amount > 0 && t.tx_date.startsWith(month))
      .reduce((acc, t) => acc + t.amount, 0);
    const expense = transactions
      .filter((t) => t.amount < 0 && t.tx_date.startsWith(month))
      .reduce((acc, t) => acc + Math.abs(t.amount), 0);

    return { income, expense } as T;
  }

  return { total: 0 } as T;
}

// ----------------------------------------------------
// CATEGORY OPS
// ----------------------------------------------------
export async function listCategories(): Promise<CategoryRow[]> {
  await ensureInitialized();
  return categories;
}

export async function addCategory(
  id: string,
  name: string,
  type: "expense" | "income"
) {
  await ensureInitialized();
  categories.push({ id, name, type, icon: null });
}

export async function deleteCategory(id: string) {
  await ensureInitialized();
  categories = categories.filter((c) => c.id !== id);
  budgets = budgets.filter((b) => b.category_id !== id);
  transactions = refreshCategoryNames(
    transactions.map((t) => (t.category_id === id ? { ...t, category_id: null } : t))
  );
}

// ----------------------------------------------------
// BUDGETS (WEB)
// ----------------------------------------------------
export async function listBudgets(month: string): Promise<BudgetRow[]> {
  await ensureInitialized();
  return budgets.filter((b) => b.month === month);
}

export async function setBudget(
  month: string,
  category_id: string,
  limit_amount: number
) {
  await ensureInitialized();
  const existing = budgets.find((b) => b.month === month && b.category_id === category_id);

  if (existing) {
    existing.limit_amount = limit_amount;
    return;
  }

  budgets.push({
    id: "b-" + Math.random().toString(36).slice(2, 10),
    month,
    category_id,
    limit_amount,
  });
}

// ----------------------------------------------------
// FINAL getDb()
// ----------------------------------------------------
export async function getDb() {
  await ensureInitialized();

  return {
    execAsync,
    runAsync,
    getAllAsync,
    getFirstAsync,

    // categories
    listCategories,
    addCategory,
    deleteCategory,

    // budgets
    listBudgets,
    setBudget,
  };
}

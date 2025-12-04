// src/db/client.web.ts
// Web için basit in-memory database (geliştirme amaçlı)

// =======================================================
// TYPES
// =======================================================
export type CategoryRow = {
  id: string;
  name: string;
  type: "expense" | "income";
  icon: string; // null olmayacak
};

export async function listBudgets(month: string) {
  return budgets.filter((b) => b.month === month);
}

export async function setBudget(month: string, category_id: string, limit_amount: number) {
  const existing = budgets.find(
    (b) => b.month === month && b.category_id === category_id
  );

  if (existing) {
    existing.limit_amount = limit_amount;
  } else {
    budgets.push({
      id: "b-" + Math.random().toString(36).slice(2, 9),
      month,
      category_id,
      limit_amount,
    });
  }
}

// --------------------------
// TRANSACTIONS
// --------------------------
type Tx = {
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

// =======================================================
// DEFAULT CATEGORY LIST
// =======================================================
let categories: CategoryRow[] = [
  { id: "cat-market", name: "Market", type: "expense", icon: "cart" },
  { id: "cat-yemek", name: "Yemek", type: "expense", icon: "utensils" },
  { id: "cat-maas", name: "Maaş", type: "income", icon: "wallet" },
];

// =======================================================
// BUDGETS (WEB)
// =======================================================
let budgets: BudgetRow[] = [];

export async function listBudgets(month: string): Promise<BudgetRow[]> {
  return budgets.filter((b) => b.month === month);
}

export async function setBudget(
  month: string,
  category_id: string,
  limit_amount: number
) {
  const existing = budgets.find(
    (b) => b.month === month && b.category_id === category_id
  );

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

// =======================================================
// TRANSACTIONS (WEB)
// =======================================================
let transactions: Tx[] = [];

// =======================================================
// Web-compatible SQLite-like functions
// =======================================================
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
      category_name: null,
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
  // list transactions by month
  if (sql.includes("FROM transactions")) {
    if (sql.includes("strftime('%Y-%m', t.tx_date)=?")) {
      const month = params[0];

      return transactions
        .map((t) => ({
          ...t,
          category_name:
            categories.find((c) => c.id === t.category_id)?.name ?? null,
        }))
        .filter((t) => t.tx_date.startsWith(month));
    }

    return transactions.map((t) => ({
      ...t,
      category_name:
        categories.find((c) => c.id === t.category_id)?.name ?? null,
    }));
  }
  return [];
}

async function getFirstAsync<T extends Record<string, any>>(
  sql: string,
  params: any[] = []
): Promise<T | null> {
  if (sql.includes("SUM") && params[0]) {
    const month = params[0];

    const total = transactions
      .filter((t) => t.amount < 0 && t.tx_date.startsWith(month))
      .reduce((acc, t) => acc + Math.abs(t.amount), 0);

    return { total } as T;
  }

  return { total: 0 } as T;
}

// =======================================================
// CATEGORY OPS
// =======================================================
export async function listCategories(): Promise<CategoryRow[]> {
  return categories;
}

export async function addCategory(
  id: string,
  name: string,
  type: "expense" | "income"
) {
  categories.push({ id, name, type, icon: "" }); // icon null OLAMAZ
}

export async function deleteCategory(id: string) {
  await ensureInitialized();
  categories = categories.filter((c) => c.id !== id);
}

// =======================================================
// FINAL getDb()
// =======================================================
export async function getDb() {
  await ensureInitialized();

  return {
    // SQL-like ops
    execAsync,
    runAsync,
    getAllAsync,
    getFirstAsync,

    // category ops (WEB)
    listCategories,
    addCategory,
    deleteCategory,

    // budget ops (WEB)
    listBudgets,
    setBudget,
  };
}

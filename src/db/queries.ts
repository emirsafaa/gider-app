import { getDb } from "./client";

// -------------------------------------------
// TYPES
// -------------------------------------------
export type TransactionRow = {
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

export type CategoryRow = {
  id: string;
  name: string;
  type: string;
  icon?: string | null;
};

export type BudgetRow = {
  id?: string;
  month: string;
  category_id: string;
  limit_amount: number;
};

// -------------------------------------------
// TRANSACTIONS
// -------------------------------------------
export async function listTransactions(
  month?: string
): Promise<TransactionRow[]> {
  const db = await getDb();

  if (month) {
    return (await db.getAllAsync(
      `SELECT t.*, c.name as category_name
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE strftime('%Y-%m', t.tx_date)=?
       ORDER BY t.tx_date DESC, t.created_at DESC;`,
      [month]
    )) as TransactionRow[];
  }

  return (await db.getAllAsync(
    `SELECT t.*, c.name as category_name
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     ORDER BY t.tx_date DESC, t.created_at DESC;`
  )) as TransactionRow[];
}

export async function addTransaction(input: TransactionRow) {
  const db = await getDb();

  await db.runAsync(
    `INSERT INTO transactions
      (id, account_id, category_id, amount, note, tx_date, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?);`,
    [
      input.id,
      input.account_id,
      input.category_id ?? null,
      input.amount,
      input.note ?? null,
      input.tx_date,
      input.created_at,
      input.updated_at,
    ]
  );
}

// -------------------------------------------
// MONTH SUMMARY
// -------------------------------------------
export async function monthSummary(month: string) {
  const rows = await listTransactions(month);

  let income = 0;
  let expense = 0;

  for (const r of rows) {
    const amount = Number(r.amount) || 0;

    if (amount > 0) income += amount;
    else if (amount < 0) expense += Math.abs(amount);
  }

  return {
    income,
    expense,
    net: income - expense,
  };
}

export async function monthExpenseTotal(month: string) {
  const s = await monthSummary(month);
  return s.expense;
}

// -------------------------------------------
// CATEGORIES
// -------------------------------------------
export async function listCategories(): Promise<CategoryRow[]> {
  const db = await getDb();
  return (await db.getAllAsync(
    `SELECT * FROM categories ORDER BY name ASC;`
  )) as CategoryRow[];
}

export const MAX_CATEGORIES = 10;

export async function addCategory(
  id: string,
  name: string,
  type: string
) {
  const db = await getDb();

  const countRow =
    ((await db.getFirstAsync(
      `SELECT COUNT(*) as total FROM categories;`
    )) as { total?: number | null }) ?? {};

  if ((countRow.total ?? 0) >= MAX_CATEGORIES) {
    throw new Error(`En fazla ${MAX_CATEGORIES} kategori eklenebilir.`);
  }

  await db.runAsync(
    `INSERT INTO categories (id, name, type)
     VALUES (?,?,?)`,
    [id, name, type]
  );
}

export async function deleteCategory(id: string) {
  const db = await getDb();

  await db.runAsync(
    `DELETE FROM categories WHERE id=?`,
    [id]
  );
}

// -------------------------------------------
// BUDGETS
// -------------------------------------------
export async function listBudgets(
  month: string
): Promise<BudgetRow[]> {
  const db = await getDb();

  return (await db.getAllAsync(
    `SELECT * FROM budgets WHERE month=? ORDER BY category_id ASC`,
    [month]
  )) as BudgetRow[];
}

export async function setBudget(
  month: string,
  category_id: string,
  limit_amount: number
) {
  const db = await getDb();

  await db.runAsync(
    `INSERT INTO budgets (month, category_id, limit_amount)
     VALUES (?,?,?)
     ON CONFLICT(month, category_id)
     DO UPDATE SET limit_amount = excluded.limit_amount;`,
    [month, category_id, limit_amount]
  );
}

// -------------------------------------------
// MONTHLY SPENT BY CATEGORY
// -------------------------------------------
export async function monthSpentByCategory(
  month: string,
  category_id: string
) {
  const rows = await listTransactions(month);

  let total = 0;

  for (const t of rows) {
    if (t.category_id === category_id && t.amount < 0) {
      total += Math.abs(t.amount);
    }
  }

  return total;
}

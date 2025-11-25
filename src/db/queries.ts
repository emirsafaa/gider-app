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
  const db = await getDb();

  const row = await db.getFirstAsync<{
    income: number | null;
    expense: number | null;
  }>(
    `SELECT 
        COALESCE(SUM(CASE WHEN amount > 0 THEN amount END), 0) as income,
        COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) END), 0) as expense
      FROM transactions
      WHERE strftime('%Y-%m', tx_date)=?;`,
    [month]
  );

  const income = Number(row?.income ?? 0);
  const expense = Number(row?.expense ?? 0);

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

export async function addCategory(
  id: string,
  name: string,
  type: string
) {
  const db = await getDb();

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
  const db = await getDb();

  const row = await db.getFirstAsync<{ total: number | null }>(
    `SELECT COALESCE(SUM(ABS(amount)), 0) as total
     FROM transactions
     WHERE category_id = ? AND amount < 0 AND strftime('%Y-%m', tx_date)=?;`,
    [category_id, month]
  );

  return Number(row?.total ?? 0);
}

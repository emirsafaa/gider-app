// src/db/queries.ts
import { getDb } from "./client";

export async function listTransactions(month?: string) {
  const db = await getDb();

  if (month) {
    return db.getAllAsync(
      `SELECT t.*, c.name as category_name 
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE strftime('%Y-%m', t.tx_date)=?
       ORDER BY t.tx_date DESC, t.created_at DESC;`,
      [month]
    );
  }

  return db.getAllAsync(
    `SELECT t.*, c.name as category_name 
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     ORDER BY t.tx_date DESC, t.created_at DESC;`
  );
}

export type NewTransactionInput = {
  id: string;
  account_id: string;
  category_id?: string;
  amount: number;
  note?: string | null;
  tx_date: string;
  created_at: string;
  updated_at: string;
};

export async function addTransaction(input: NewTransactionInput) {
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
// --- CATEGORY QUERIES ---

export async function listCategories() {
  const db = await getDb();

  // WEB: client.web.ts içindeki categories dizisini döndürür
  if (db.listCategories) {
    return db.listCategories();
  }

  // NATIVE: sqlite sorgusu
  return db.getAllAsync(
    `SELECT * FROM categories ORDER BY name ASC;`
  );
}

export async function addCategory(id: string, name: string, type: "expense" | "income") {
  const db = await getDb();

  // WEB: addCategory fonksiyonu varsa onu kullan
  if (db.addCategory) {
    return db.addCategory(id, name, type);
  }

  // NATIVE
  await db.runAsync(
    `INSERT INTO categories (id, name, type) VALUES (?,?,?);`,
    [id, name, type]
  );
}

export async function deleteCategory(id: string) {
  const db = await getDb();

  // WEB
  if (db.deleteCategory) {
    return db.deleteCategory(id);
  }

  // NATIVE
  await db.runAsync(`DELETE FROM categories WHERE id=?;`, [id]);
}
// --- BUDGET QUERIES ---

export async function listBudgets(month: string) {
  const db = await getDb();

  if (db.listBudgets) {
    // Web
    return db.listBudgets(month);
  }

  // Native SQL
  return db.getAllAsync(
    `SELECT * FROM budgets WHERE month=? ORDER BY category_id ASC;`,
    [month]
  );
}

export async function setBudget(month: string, category_id: string, limit_amount: number) {
  const db = await getDb();

  if (db.setBudget) {
    // Web
    return db.setBudget(month, category_id, limit_amount);
  }

  // Native SQL (upsert)
  await db.runAsync(
    `INSERT INTO budgets (month, category_id, limit_amount)
     VALUES (?,?,?)
     ON CONFLICT(month, category_id) DO UPDATE SET limit_amount=excluded.limit_amount;`,
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

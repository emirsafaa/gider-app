import { getDb } from "./client";

// -------------------------------------------
// TYPES
// -------------------------------------------
export type MonthSummary = {
  income: number;
  expense: number;
  net: number;
};

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
  month?: string,
  keyword?: string
): Promise<TransactionRow[]> {
  const db = await getDb();

  let query = `
    SELECT t.*, c.name as category_name
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
  `;
  
  const params: any[] = [];
  const conditions: string[] = [];

  // Ay filtresi (varsa)
  if (month) {
    conditions.push("strftime('%Y-%m', t.tx_date) = ?");
    params.push(month);
  }

  // Kelime arama (varsa) - Not veya Kategori isminde arar
  if (keyword) {
    conditions.push("(t.note LIKE ? OR c.name LIKE ?)");
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += " ORDER BY t.tx_date DESC, t.created_at DESC;";

  // Gelen veriyi TransactionRow[] olarak tipleyelim
  return (await db.getAllAsync(query, params)) as TransactionRow[];
}

export async function addTransaction(input: TransactionRow) {
  const db = await getDb();

  await db.runAsync(
    `INSERT INTO transactions
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

export async function deleteTransaction(id: string) {
  const db = await getDb();
  await db.runAsync("DELETE FROM transactions WHERE id = ?", [id]);
}

// -------------------------------------------
// MONTH SUMMARY
// -------------------------------------------
export async function monthSummary(month: string): Promise<MonthSummary> {
  // Sadece ayı filtreleyerek çağırıyoruz (keyword yok)
  const rows: TransactionRow[] = await listTransactions(month);

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

// -------------------------------------------
// CATEGORIES
// -------------------------------------------
export async function listCategories(): Promise<CategoryRow[]> {
  const db = await getDb();
  return (await db.getAllAsync(
  return (await db.getAllAsync(
    `SELECT * FROM categories ORDER BY name ASC;`
  )) as CategoryRow[];
  )) as CategoryRow[];
}

export async function addCategory(
  id: string,
  name: string,
  type: string
) {
export async function addCategory(
  id: string,
  name: string,
  type: string
) {
  const db = await getDb();

  await db.runAsync(
    `INSERT INTO categories (id, name, type)
     VALUES (?,?,?)`,
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

// -------------------------------------------
// BUDGETS
// -------------------------------------------
export async function listBudgets(
  month: string
): Promise<BudgetRow[]> {
  const db = await getDb();

  return (await db.getAllAsync(
    `SELECT * FROM budgets WHERE month=? ORDER BY category_id ASC`,
  return (await db.getAllAsync(
    `SELECT * FROM budgets WHERE month=? ORDER BY category_id ASC`,
    [month]
  )) as BudgetRow[];
}

// Tek bir kategori bütçesini getir (Bütçe kontrolü için)
export async function getBudget(month: string, categoryId: string): Promise<BudgetRow | undefined> {
  const budgets = await listBudgets(month);
  return budgets.find(b => b.category_id === categoryId);
}

export async function setBudget(
  month: string,
  category_id: string,
  limit_amount: number
) {
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
  const rows: TransactionRow[] = await listTransactions(month);

  let total = 0;

  for (const t of rows) {
    if (t.category_id === category_id && t.amount < 0) {
      total += Math.abs(t.amount);
    }
  }

  return total;
}

export async function expensesByCategory(month: string) {
  const db = await getDb();
  
  const rows = (await db.getAllAsync(
    `SELECT c.name, SUM(ABS(t.amount)) as total
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     WHERE strftime('%Y-%m', t.tx_date) = ? AND t.amount < 0
     GROUP BY c.name
     ORDER BY total DESC;`,
    [month]
  )) as { name: string | null; total: number }[];

  return rows.map((r) => ({
    x: r.name ?? "Diğer",
    y: r.total,
    label: r.name ?? "Diğer" 
  }));
}
// src/db/queries.ts dosyasının EN ALTINA ekle:

import dayjs from "dayjs"; // dayjs importunun en tepede olduğundan emin ol

// -------------------------------------------
// RECURRING TRANSACTIONS
// -------------------------------------------
export type RecurringRow = {
  id: string;
  amount: number;
  category_id?: string | null;
  account_id: string;
  note?: string | null;
  frequency: string;
  next_due_date: string;
  category_name?: string | null;
};

export async function listRecurring(): Promise<RecurringRow[]> {
  const db = await getDb();
  return (await db.getAllAsync(`
    SELECT r.*, c.name as category_name
    FROM recurring_transactions r
    LEFT JOIN categories c ON r.category_id = c.id
    ORDER BY r.next_due_date ASC;
  `)) as RecurringRow[];
}

export async function addRecurring(input: Omit<RecurringRow, 'category_name'>) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO recurring_transactions (id, amount, category_id, account_id, note, frequency, next_due_date)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [input.id, input.amount, input.category_id ?? null, input.account_id, input.note ?? null, input.frequency, input.next_due_date]
  );
}

export async function deleteRecurring(id: string) {
  const db = await getDb();
  await db.runAsync(`DELETE FROM recurring_transactions WHERE id = ?`, [id]);
}

// Uygulama açılışında çalışacak fonksiyon
export async function processRecurringTransactions() {
  const db = await getDb();
  const today = dayjs().format("YYYY-MM-DD");

  // 1. Günü gelmiş veya geçmiş işlemleri bul
  const dues = (await db.getAllAsync(
    `SELECT * FROM recurring_transactions WHERE next_due_date <= ?`,
    [today]
  )) as RecurringRow[];

  for (const item of dues) {
    // 2. Ana tabloya (transactions) ekle
    const newTxId = "tx-auto-" + Math.random().toString(36).slice(2, 10);
    await addTransaction({
      id: newTxId,
      account_id: item.account_id,
      category_id: item.category_id,
      amount: item.amount,
      note: item.note ? `(Otomatik) ${item.note}` : "(Otomatik Ödeme)",
      tx_date: item.next_due_date, // Orijinal vade tarihinde işle
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 3. Bir sonraki vade tarihini hesapla (1 ay sonrası)
    // Not: Basitlik için sadece aylık ekliyoruz. Haftalık vs. için burası genişletilebilir.
    const nextDate = dayjs(item.next_due_date).add(1, 'month').format("YYYY-MM-DD");

    // 4. Recurring tablosunu güncelle
    await db.runAsync(
      `UPDATE recurring_transactions SET next_due_date = ? WHERE id = ?`,
      [nextDate, item.id]
    );
  }
  
  if (dues.length > 0) {
    console.log(`${dues.length} adet tekrarlayan işlem işlendi.`);
  }
}
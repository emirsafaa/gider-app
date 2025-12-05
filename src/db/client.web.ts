// src/db/client.web.ts
// Web için basit in-memory database simülasyonu

export type CategoryRow = {
  id: string;
  name: string;
  type: string;
  icon?: string | null;
};

export type BudgetRow = {
  id: string;
  month: string;
  category_id: string;
  limit_amount: number;
};

export type RecurringRow = {
  id: string;
  amount: number;
  category_id: string | null;
  account_id: string;
  note: string | null;
  frequency: string;
  next_due_date: string;
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

// =======================================================
// IN-MEMORY DATA
// =======================================================
let categories: CategoryRow[] = [
  { id: "cat-market", name: "Market", type: "expense", icon: "cart" },
  { id: "cat-yemek", name: "Yemek", type: "expense", icon: "utensils" },
  { id: "cat-maas", name: "Maaş", type: "income", icon: "wallet" },
];

let budgets: BudgetRow[] = [];
let transactions: Tx[] = [];
let recurring: RecurringRow[] = [];

// =======================================================
// SQL MOCK FUNCTIONS
// =======================================================

async function execAsync(_sql: string) { return; }

async function runAsync(sql: string, params: any[] = []) {
  // --- INSERT TRANSACTIONS ---
  if (sql.startsWith("INSERT INTO transactions")) {
    const [id, account_id, category_id, amount, note, tx_date, created_at, updated_at] = params;
    transactions.unshift({ id, account_id, category_id, amount, note, tx_date, created_at, updated_at });
    return;
  }

  // --- DELETE TRANSACTION ---
  if (sql.startsWith("DELETE FROM transactions")) {
    const id = params[0];
    transactions = transactions.filter((t) => t.id !== id);
    return;
  }

  // --- CATEGORY OPS ---
  if (sql.startsWith("INSERT INTO categories")) {
    const [id, name, type] = params;
    categories.push({ id, name, type, icon: "" });
    return;
  }
  if (sql.startsWith("DELETE FROM categories")) {
    const id = params[0];
    categories = categories.filter((c) => c.id !== id);
    return;
  }

  // --- BUDGET OPS ---
  if (sql.startsWith("INSERT INTO budgets")) {
    const [month, category_id, limit_amount] = params;
    const existingIndex = budgets.findIndex((b) => b.month === month && b.category_id === category_id);
    if (existingIndex >= 0) budgets[existingIndex].limit_amount = limit_amount;
    else budgets.push({ id: "b-" + Math.random().toString(36).slice(2, 8), month, category_id, limit_amount });
    return;
  }

  // --- RECURRING OPS ---
  if (sql.startsWith("INSERT INTO recurring_transactions")) {
    const [id, amount, category_id, account_id, note, frequency, next_due_date] = params;
    recurring.push({ id, amount, category_id, account_id, note, frequency, next_due_date });
    return;
  }
  if (sql.startsWith("DELETE FROM recurring_transactions")) {
    const id = params[0];
    recurring = recurring.filter(r => r.id !== id);
    return;
  }
  if (sql.startsWith("UPDATE recurring_transactions")) {
    // UPDATE recurring_transactions SET next_due_date=? WHERE id=?
    const [next_due_date, id] = params;
    const item = recurring.find(r => r.id === id);
    if (item) item.next_due_date = next_due_date;
    return;
  }
}

async function getAllAsync(sql: string, params: any[] = []): Promise<any[]> {
  // --- LIST TRANSACTIONS ---
  if (sql.includes("FROM transactions")) {
    // Grafik (Group by)
    if (sql.includes("GROUP BY c.name")) {
      const month = params[0];
      const relevantTx = transactions.filter(t => t.tx_date.startsWith(month) && t.amount < 0);
      const groups: Record<string, number> = {};
      relevantTx.forEach(t => {
        const catName = categories.find(c => c.id === t.category_id)?.name ?? "Diğer";
        if (!groups[catName]) groups[catName] = 0;
        groups[catName] += Math.abs(t.amount);
      });
      return Object.entries(groups).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
    }

    // Liste + Filtre
    let filtered = transactions.map((t) => ({
      ...t,
      category_name: categories.find((c) => c.id === t.category_id)?.name ?? null,
    }));

    let paramIndex = 0;
    if (sql.includes("strftime('%Y-%m', t.tx_date)")) {
      const month = params[paramIndex++];
      filtered = filtered.filter(t => t.tx_date.startsWith(month));
    }
    if (sql.includes("LIKE")) {
      const rawKeyword = params[paramIndex++];
      if(params.length > paramIndex) paramIndex++; 
      const keyword = rawKeyword.replace(/%/g, "").toLowerCase();
      filtered = filtered.filter(t => (t.note?.toLowerCase().includes(keyword) || t.category_name?.toLowerCase().includes(keyword)));
    }
    return filtered;
  }

  if (sql.includes("FROM categories")) return categories;
  if (sql.includes("FROM budgets")) {
    const month = params[0];
    return budgets.filter((b) => b.month === month);
  }
  
  // --- LIST RECURRING ---
  if (sql.includes("FROM recurring_transactions")) {
    // Join category name manually
    return recurring.map(r => ({
      ...r,
      category_name: categories.find(c => c.id === r.category_id)?.name ?? null
    }));
  }

  return [];
}

async function getFirstAsync<T>(sql: string, params: any[] = []): Promise<T | null> { return null; }

export async function getDb() {
  return { execAsync, runAsync, getAllAsync, getFirstAsync };
}
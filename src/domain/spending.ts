import { matchRecurring, type RecurringExpense } from "./recurring";
import type { ISODate, Transaction, TransactionSource } from "./types";

/** Um gasto pronto para exibição (valor sempre positivo). */
export type Expense = {
  id: string;
  date: ISODate;
  description: string;
  amount: number;
  source: TransactionSource;
  category: string;
  /** id do gasto fixo detectado (assinatura, mensalidade...), se houver. */
  fixedId?: string;
  variable: boolean;
  pending: boolean;
  installment?: { number: number; total: number };
};

/**
 * Converte transações em "gastos": saídas reais de dinheiro, excluindo
 * transferências entre contas próprias, aplicações e pagamento de fatura
 * (as compras do cartão já entram individualmente).
 */
export function buildExpenses(transactions: Transaction[], recurring: RecurringExpense[]): Expense[] {
  const out: Expense[] = [];
  for (const t of transactions) {
    if (t.amount >= 0 || t.kind !== "regular") continue;
    const fixed = matchRecurring(t, recurring);
    out.push({
      id: t.id,
      date: t.date,
      description: t.description,
      amount: Math.abs(t.amount),
      source: t.source,
      category: t.category,
      fixedId: fixed?.id,
      variable: !fixed,
      pending: t.status === "pending",
      installment: t.installment ? { number: t.installment.number, total: t.installment.total } : undefined,
    });
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export type CategoryTotal = { category: string; total: number; count: number };

export function totalsByCategory(expenses: Expense[]): CategoryTotal[] {
  const map = new Map<string, CategoryTotal>();
  for (const e of expenses) {
    const cur = map.get(e.category) ?? { category: e.category, total: 0, count: 0 };
    cur.total += e.amount;
    cur.count += 1;
    map.set(e.category, cur);
  }
  return [...map.values()].map((c) => ({ ...c, total: round2(c.total) })).sort((a, b) => b.total - a.total);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100 || 0; // "|| 0" evita exibir "-R$ 0,00" (zero negativo)
}

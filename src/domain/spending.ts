import type { FinanceConfig } from "@/config/finance";
import { matchRecurring, type RecurringExpense } from "./recurring";
import { diffDays } from "@/lib/dates";
import type { Fortnight } from "./salary";
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

export type BudgetStatus = "ok" | "warning" | "danger" | "over";

export type FortnightBudget = {
  limit: number;
  spent: number;
  remaining: number;
  ratio: number;
  status: BudgetStatus;
  /** Quanto ainda dá para gastar por dia até o próximo salário. */
  perDayLeft: number | null;
  /** Ritmo esperado: % da quinzena já decorrido. */
  elapsedRatio: number;
  items: Expense[];
};

/** Valor que uma compra conta no teto, aplicando a política de parcelamento. */
function budgetAmount(e: Expense, policy: FinanceConfig["budget"]["installmentPolicy"]): number {
  if (!e.installment || e.installment.total <= 1) return e.amount;
  if (e.installment.number !== 1) return 0; // parcelas 2..N não são gasto novo
  return policy === "full-amount" ? e.amount * e.installment.total : e.amount;
}

export function fortnightBudget(
  expenses: Expense[],
  fortnight: Fortnight,
  today: ISODate,
  cfg: FinanceConfig["budget"],
): FortnightBudget {
  const items = expenses.filter(
    (e) => e.variable && e.date >= fortnight.start && e.date < fortnight.end && e.date <= today,
  );
  const spent = round2(items.reduce((s, e) => s + budgetAmount(e, cfg.installmentPolicy), 0));
  const limit = cfg.limitPerFortnight;
  const remaining = round2(limit - spent);
  const ratio = limit > 0 ? spent / limit : 0;
  const status: BudgetStatus =
    ratio > 1 ? "over" : ratio >= cfg.dangerAt ? "danger" : ratio >= cfg.warnAt ? "warning" : "ok";
  const daysLeft = fortnight.awaitingSalary ? 1 : Math.max(fortnight.daysLeft, 1);
  const elapsed = Math.min(Math.max(diffDays(fortnight.start, today) + 1, 0), fortnight.totalDays);

  return {
    limit,
    spent,
    remaining,
    ratio,
    status,
    perDayLeft: remaining > 0 ? round2(remaining / daysLeft) : null,
    elapsedRatio: elapsed / fortnight.totalDays,
    items,
  };
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

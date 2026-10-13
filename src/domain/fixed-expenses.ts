import { clampedDate, monthOf, parts } from "@/lib/dates";
import { matchRecurring, type RecurringExpense } from "./recurring";
import type { ISODate, Transaction, YearMonth } from "./types";

export type FixedExpenseStatus = {
  id: string;
  name: string;
  amount: number;
  method: RecurringExpense["method"];
  status: "pago" | "pendente" | "lancado" | "a-lancar";
  paidOn?: ISODate;
  dueDate?: ISODate;
  /** Desde quando a cobrança aparece no histórico. */
  since: ISODate;
};

/**
 * Situação de cada gasto fixo detectado no mês atual. Débitos e PIX são
 * procurados na conta no mês corrente; assinaturas no cartão, na fatura aberta.
 */
export function fixedExpensesStatus(
  recurring: RecurringExpense[],
  transactions: Transaction[],
  today: ISODate,
  currentBillMonth: YearMonth,
  billMonthOf: (t: Transaction) => YearMonth,
): FixedExpenseStatus[] {
  const month = monthOf(today);
  const { y, m } = parts(today);

  return recurring.map((r) => {
    const base = { id: r.id, name: r.name, amount: r.amount, method: r.method, since: r.firstDate };
    const matches = transactions.filter((t) => t.amount < 0 && matchRecurring(t, recurring)?.id === r.id);

    if (r.method === "cartao") {
      const charged = matches.find((t) => t.source === "cartao" && billMonthOf(t) === currentBillMonth);
      return { ...base, status: charged ? ("lancado" as const) : ("a-lancar" as const), paidOn: charged?.date };
    }

    const paid = matches.find((t) => t.source === "conta" && monthOf(t.date) === month);
    return {
      ...base,
      status: paid ? ("pago" as const) : ("pendente" as const),
      paidOn: paid?.date,
      dueDate: clampedDate(y, m, r.day),
    };
  });
}

export function monthlyFixedTotal(recurring: RecurringExpense[]): number {
  return recurring.reduce((s, r) => s + r.amount, 0);
}

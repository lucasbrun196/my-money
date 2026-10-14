/** Comparação entre duas faturas quaisquer do cartão (código puro, roda no cliente). */
import { addDays, addMonths, diffDays } from "@/lib/dates";
import { billDates, billReferenceMonth, resolveBillMonth, type CardCycle } from "./credit-card";
import { round2 } from "./spending";
import type { CardBill, ISODate, Transaction, YearMonth } from "./types";

/** Uma fatura vista como ciclo: do dia seguinte ao fechamento anterior até o fechamento. */
export type BillCycle = {
  /** Mês do vencimento (identificador interno da fatura). */
  key: YearMonth;
  /** Mês de referência, o nome que o banco usa (ver `billReferenceMonth`). */
  ref: YearMonth;
  start: ISODate;
  close: ISODate;
  due: ISODate;
  open: boolean;
  /** Fechada: total cobrado pelo banco. Aberta: parcial até agora. */
  total: number;
  /** Quantidade de compras na fatura. */
  count: number;
  /** Soma dos lançamentos por dia do ciclo (índice 0 = `start`); estornos entram negativos. */
  perDay: number[];
};

/**
 * Monta os ciclos das faturas fechadas (total do banco) e da aberta (parcial),
 * do mais recente ao mais antigo, com os lançamentos de cada uma dia a dia.
 */
export function buildBillCycles(p: {
  bills: CardBill[];
  open: { key: YearMonth; closeDate: ISODate; dueDate: ISODate; total: number };
  cycle: CardCycle;
  transactions: Transaction[];
}): BillCycle[] {
  const closed = p.bills
    .map((b) => {
      const key = b.dueDate.slice(0, 7);
      return { key, close: b.closeDate ?? billDates(key, p.cycle).closeDate, due: b.dueDate, total: b.total, open: false };
    })
    .filter((b) => b.key < p.open.key);
  const all = [...closed, { key: p.open.key, close: p.open.closeDate, due: p.open.dueDate, total: p.open.total, open: true }].sort(
    (a, b) => (a.key < b.key ? -1 : 1),
  );

  const card = p.transactions.filter((t) => t.source === "cartao" && t.kind !== "card-payment");

  return all
    .map((b, i) => {
      const prev = all[i - 1];
      const prevClose = prev && prev.key === addMonths(b.key, -1) ? prev.close : billDates(addMonths(b.key, -1), p.cycle).closeDate;
      const start = addDays(prevClose, 1);
      const perDay = Array<number>(Math.max(diffDays(start, b.close) + 1, 1)).fill(0);
      let count = 0;
      for (const t of card) {
        if (resolveBillMonth(t, p.cycle) !== b.key) continue;
        const idx = Math.min(Math.max(diffDays(start, t.date), 0), perDay.length - 1);
        perDay[idx] += -t.amount; // compra positiva, estorno negativo
        if (t.amount < 0) count++;
      }
      return {
        key: b.key,
        ref: billReferenceMonth(b.close),
        start,
        close: b.close,
        due: b.due,
        open: b.open,
        total: round2(b.total),
        count,
        perDay: perDay.map(round2),
      };
    })
    .reverse();
}

export type CycleSide = {
  bill: BillCycle;
  /** Acumulado por dia do ciclo; null nos dias que ainda não chegaram (fatura aberta). */
  cumulative: (number | null)[];
};

export type BillComparison = {
  a: CycleSide;
  b: CycleSide;
  /**
   * Quando uma das faturas é a aberta, compara "até o mesmo dia do ciclo",
   * para não comparar uma fatura pela metade com uma inteira.
   */
  sameDay: { day: number; a: number; b: number } | null;
};

function side(bill: BillCycle, today: ISODate): CycleSide {
  const lastIndex = bill.open ? diffDays(bill.start, today) : bill.perDay.length - 1;
  let acc = 0;
  return {
    bill,
    cumulative: bill.perDay.map((v, i) => {
      if (i > lastIndex) return null;
      acc += v;
      return round2(acc);
    }),
  };
}

export function compareBills(a: BillCycle, b: BillCycle, today: ISODate): BillComparison {
  const sa = side(a, today);
  const sb = side(b, today);
  let sameDay: BillComparison["sameDay"] = null;
  if (a.open !== b.open) {
    const open = a.open ? a : b;
    const day = Math.min(Math.max(diffDays(open.start, today) + 1, 1), open.perDay.length);
    const at = (s: CycleSide) => s.cumulative[Math.min(day, s.cumulative.length) - 1] ?? s.bill.total;
    sameDay = { day, a: at(sa), b: at(sb) };
  }
  return { a: sa, b: sb, sameDay };
}

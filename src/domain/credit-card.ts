import { addMonths, clampedDate, diffDays, monthDiff, monthOf, parts } from "@/lib/dates";
import { matchRecurring, type RecurringExpense } from "./recurring";
import { round2 } from "./spending";
import type { CardBill, CreditCard, ISODate, Transaction, YearMonth } from "./types";

/** Ciclo do cartão (dia de fechamento e de vencimento), aprendido das faturas reais. */
export type CardCycle = { closingDay: number; dueDay: number };

/**
 * Deduz o ciclo pelas últimas faturas fechadas (mediana dos dias, pois o banco
 * varia o fechamento em alguns dias). Sem faturas, usa o vencimento informado
 * pelo banco e assume fechamento 7 dias antes.
 */
export function inferCardCycle(bills: CardBill[], card: CreditCard | null): CardCycle | null {
  const recent = [...bills].sort((a, b) => (a.dueDate < b.dueDate ? 1 : -1)).slice(0, 6);
  const med = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  };
  const dues = recent.map((b) => parts(b.dueDate).d);
  const closes = recent.filter((b) => b.closeDate).map((b) => parts(b.closeDate!).d);
  const dueDay = dues.length ? med(dues) : card?.dueDate ? parts(card.dueDate).d : null;
  if (dueDay == null) return null;
  const closingDay = closes.length ? med(closes) : ((dueDay - 7 + 30) % 30) + 1;
  return { closingDay, dueDay };
}

/**
 * Mês da fatura (= mês do vencimento) em que uma compra feita em `date` cai.
 * Com fechamento dia 3 e vencimento dia 10: compra em 02/10 → fatura 2026-10;
 * compra em 04/10 (melhor dia) → fatura 2026-11.
 */
export function billMonthForDate(date: ISODate, card: CardCycle): YearMonth {
  const { y, m, d } = parts(date);
  const closeOffset = d > card.closingDay ? 1 : 0;
  const dueOffset = card.dueDay > card.closingDay ? 0 : 1;
  return clampedDate(y, m + closeOffset + dueOffset, 1).slice(0, 7);
}

export function billDates(
  month: YearMonth,
  card: CardCycle,
): { closeDate: ISODate; dueDate: ISODate } {
  const [y, m] = month.split("-").map(Number);
  const closeMonth = card.dueDay > card.closingDay ? m : m - 1;
  return { closeDate: clampedDate(y, closeMonth, card.closingDay), dueDate: clampedDate(y, m, card.dueDay) };
}

/** Mês da fatura de uma transação do cartão, usando o dado do banco quando existir. */
export function resolveBillMonth(t: Transaction, card: CardCycle): YearMonth {
  if (t.billMonth) return t.billMonth;
  const inst = t.installment;
  if (inst && inst.number > 1) {
    // Se a data já é a de lançamento (diferente da data da compra), ela basta.
    if (inst.purchaseDate && inst.purchaseDate !== t.date) return billMonthForDate(t.date, card);
    // Caso contrário a data é a da compra: parcela N cai N-1 faturas depois.
    return addMonths(billMonthForDate(t.date, card), inst.number - 1);
  }
  return billMonthForDate(t.date, card);
}

/**
 * Cada banco usa `billForecastDate` (AAAA-MM) com um significado: no Santander
 * é o mês de referência, um mês ANTES do vencimento. Em vez de presumir, mede
 * a diferença nas transações que têm as duas informações (fatura confirmada
 * via `billId` + previsão) e devolve o deslocamento mais comum, ou null se
 * não houver amostra (nesse caso a previsão é ignorada).
 */
export function inferForecastOffset(samples: { forecast: YearMonth; dueMonth: YearMonth }[]): number | null {
  const counts = new Map<number, number>();
  for (const s of samples) {
    const d = monthDiff(s.forecast, s.dueMonth);
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  let best: number | null = null;
  for (const [offset, n] of counts) if (best === null || n > counts.get(best)!) best = offset;
  return best;
}

/** Remove marcações de parcela ("PARC 01/10", "02/10") mantendo o texto original. */
export function stripInstallment(s: string): string {
  return s
    .replace(/\s*\bPARC(ELA)?\.?\s*\d{1,2}\s*(\/|DE)\s*\d{1,2}\b/gi, "")
    .replace(/\s\d{1,2}\/\d{1,2}\s*$/, "")
    .trim();
}

export function normalizeDescription(s: string): string {
  return s
    .toUpperCase()
    .replace(/\bPARC(ELA)?\.?\s*\d{1,2}\s*(\/|DE)\s*\d{1,2}\b/g, "")
    .replace(/\b\d{1,2}\/\d{1,2}\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type UpcomingItem = {
  description: string;
  amount: number;
  kind: "parcela" | "fixo" | "compra";
  label?: string;
  projected: boolean;
};

export type UpcomingBill = {
  month: YearMonth;
  closeDate: ISODate;
  dueDate: ISODate;
  installments: number;
  fixed: number;
  other: number;
  total: number;
  items: UpcomingItem[];
};

export type InstallmentPlan = {
  description: string;
  amount: number;
  /** Parcela que cai na fatura atual (ou a última conhecida). */
  current: number;
  total: number;
  /** Parcelas restantes depois da fatura atual. */
  remaining: number;
  remainingAmount: number;
  endsIn: YearMonth;
};

export type CardSummary = {
  currentMonth: YearMonth;
  closeDate: ISODate;
  dueDate: ISODate;
  daysToClose: number;
  /** Compras − estornos já lançados na fatura aberta. */
  currentTotal: number;
  currentItems: Transaction[];
  pendingFixed: UpcomingItem[];
  pendingInstallments: UpcomingItem[];
  /** Parcial + assinaturas e parcelas que ainda vão entrar até o fechamento. */
  forecastClose: number;
  /** Fatura já fechada aguardando pagamento (entre o fechamento e o vencimento). */
  closedBill: CardBill | null;
  upcoming: UpcomingBill[];
  plans: InstallmentPlan[];
  waiver: { target: number; current: number; forecast: number; ratio: number; remaining: number };
  limit: { total: number; available: number; used: number } | null;
};

export function summarizeCard(params: {
  transactions: Transaction[];
  today: ISODate;
  cycle: CardCycle;
  recurring: RecurringExpense[];
  waiverTarget: number;
  bills: CardBill[];
  card: CreditCard | null;
  monthsAhead?: number;
}): CardSummary {
  const { today, cycle: cardCfg, recurring, waiverTarget, bills, card, monthsAhead = 6 } = params;
  const txs = params.transactions.filter((t) => t.source === "cartao");
  const currentMonth = billMonthForDate(today, cardCfg);
  const { closeDate, dueDate } = billDates(currentMonth, cardCfg);

  const withMonth = txs.map((t) => ({ t, month: resolveBillMonth(t, cardCfg) }));
  const isSpend = (t: Transaction) => t.kind !== "card-payment";

  const currentItems = withMonth.filter((x) => x.month === currentMonth && isSpend(x.t)).map((x) => x.t);
  const currentTotal = round2(-currentItems.reduce((s, t) => s + t.amount, 0));

  // --- Parcelamentos: agrupa as parcelas de uma mesma compra e projeta as que faltam.
  type Entry = { month: YearMonth; number: number };
  const groups = new Map<string, { description: string; amount: number; total: number; entries: Entry[] }>();
  for (const { t, month } of withMonth) {
    if (!t.installment || t.installment.total < 2 || t.amount >= 0) continue;
    const amount = round2(Math.abs(t.amount));
    // A fatura da parcela 1 identifica a compra: assinaturas anuais parceladas (mesma loja,
    // valor e nº de parcelas) repetidas a cada ano viram grupos separados.
    const firstBill = addMonths(month, -(t.installment.number - 1));
    const key = `${normalizeDescription(t.description)}|${t.installment.total}|${amount.toFixed(2)}|${firstBill}`;
    const g = groups.get(key) ?? { description: stripInstallment(t.description), amount, total: t.installment.total, entries: [] };
    g.entries.push({ month, number: t.installment.number });
    groups.set(key, g);
  }

  const futureItems = new Map<YearMonth, UpcomingItem[]>();
  const pushFuture = (month: YearMonth, item: UpcomingItem) => {
    futureItems.set(month, [...(futureItems.get(month) ?? []), item]);
  };
  const pendingInstallments: UpcomingItem[] = [];
  const plans: InstallmentPlan[] = [];

  for (const g of groups.values()) {
    const known = new Map(g.entries.map((e) => [e.number, e.month]));
    const base = g.entries.reduce((a, b) => (b.number > a.number ? b : a));
    const monthOfNumber = (k: number) => known.get(k) ?? addMonths(base.month, k - base.number);

    for (let k = 1; k <= g.total; k++) {
      const month = monthOfNumber(k);
      const item: UpcomingItem = {
        description: g.description,
        amount: g.amount,
        kind: "parcela",
        label: `${k}/${g.total}`,
        projected: !known.has(k),
      };
      if (month > currentMonth) pushFuture(month, item);
      else if (month === currentMonth && !known.has(k)) pendingInstallments.push(item);
    }

    const endsIn = monthOfNumber(g.total);
    if (endsIn >= currentMonth) {
      let current = 0;
      for (let k = 1; k <= g.total; k++) if (monthOfNumber(k) <= currentMonth) current = k;
      const remaining = g.total - current;
      plans.push({
        description: g.description,
        amount: g.amount,
        current,
        total: g.total,
        remaining,
        remainingAmount: round2(remaining * g.amount),
        endsIn,
      });
    }
  }

  // --- Compras à vista já agendadas para faturas futuras (raro, mas o Open Finance informa).
  for (const { t, month } of withMonth) {
    if (month > currentMonth && isSpend(t) && t.amount < 0 && !(t.installment && t.installment.total > 1)) {
      pushFuture(month, { description: t.description, amount: Math.abs(t.amount), kind: "compra", projected: false });
    }
  }

  // --- Assinaturas detectadas no cartão (cobranças recorrentes).
  const cardFixed = recurring.filter((f) => f.method === "cartao");
  const chargedIn = (month: YearMonth, fixedId: string) =>
    withMonth.some((x) => x.month === month && matchRecurring(x.t, recurring)?.id === fixedId);

  const pendingFixed: UpcomingItem[] = cardFixed
    .filter((f) => !chargedIn(currentMonth, f.id))
    .map((f) => ({ description: f.name, amount: f.amount, kind: "fixo", projected: true }));

  const upcoming: UpcomingBill[] = [];
  for (let i = 1; i <= monthsAhead; i++) {
    const month = addMonths(currentMonth, i);
    const items = [...(futureItems.get(month) ?? [])];
    for (const f of cardFixed) {
      if (!chargedIn(month, f.id)) items.push({ description: f.name, amount: f.amount, kind: "fixo", projected: true });
    }
    const sum = (kind: UpcomingItem["kind"]) => round2(items.filter((x) => x.kind === kind).reduce((s, x) => s + x.amount, 0));
    const installments = sum("parcela");
    const fixed = sum("fixo");
    const other = sum("compra");
    upcoming.push({
      month,
      ...billDates(month, cardCfg),
      installments,
      fixed,
      other,
      total: round2(installments + fixed + other),
      items: items.sort((a, b) => b.amount - a.amount),
    });
  }

  const forecastClose = round2(
    currentTotal +
      pendingFixed.reduce((s, x) => s + x.amount, 0) +
      pendingInstallments.reduce((s, x) => s + x.amount, 0),
  );

  const closedBill =
    bills
      .filter((b) => b.dueDate >= today && monthOf(b.dueDate) < currentMonth)
      .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))[0] ?? null;

  const target = waiverTarget;
  const limit =
    card?.creditLimit != null && card.availableLimit != null
      ? {
          total: card.creditLimit,
          available: card.availableLimit,
          used: round2(card.creditLimit - card.availableLimit),
        }
      : null;

  return {
    currentMonth,
    closeDate,
    dueDate,
    daysToClose: Math.max(diffDays(today, closeDate), 0),
    currentTotal,
    currentItems: currentItems.sort((a, b) => (a.date < b.date ? 1 : -1)),
    pendingFixed,
    pendingInstallments,
    forecastClose,
    closedBill,
    upcoming,
    plans: plans.sort((a, b) => b.remainingAmount - a.remainingAmount),
    waiver: {
      target,
      current: currentTotal,
      forecast: forecastClose,
      ratio: target > 0 ? currentTotal / target : 0,
      remaining: round2(Math.max(target - currentTotal, 0)),
    },
    limit,
  };
}

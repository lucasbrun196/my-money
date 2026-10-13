import { addMonths, diffDays, monthOf, parts } from "@/lib/dates";
import type { ISODate, Transaction } from "./types";

/**
 * Detecção automática de gastos fixos (assinaturas, mensalidades, PIX
 * recorrentes) a partir das transações: a mesma origem, com valor parecido,
 * cobrada em vários meses e no máximo ~1 vez por mês.
 */

export type RecurringExpense = {
  id: string;
  /** Chave da origem (estabelecimento ou destinatário do PIX). */
  key: string;
  name: string;
  /** Valor da última cobrança. */
  amount: number;
  method: "debito" | "cartao" | "pix";
  /** Dia do mês típico da cobrança (mediana). */
  day: number;
  firstDate: ISODate;
  lastDate: ISODate;
  /** Em quantos meses distintos apareceu. */
  months: number;
  /** Detectado com só 2 meses de histórico (cobrança nova). */
  recent: boolean;
};

const MIN_MONTHS = 3;
const MIN_AMOUNT = 2; // ignora centavos de IOF adicional etc.
const ACTIVE_DAYS = 45; // sem cobrança há mais de ~1,5 mês = cancelado
const LOOKBACK_MONTHS = 6;

const stripAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

function isPix(t: Transaction): boolean {
  return t.paymentMethod === "PIX" || /^PIX\b/i.test(t.description);
}

/** Identifica a origem da cobrança, ignorando números (CNPJ, datas, parcelas). */
export function recurringKey(t: Pick<Transaction, "description" | "counterpart" | "source" | "paymentMethod">): string {
  const base = isPix(t as Transaction)
    ? (t.counterpart ?? t.description.replace(/^PIX\s+(ENVIADO|RECEBIDO)\s*/i, ""))
    : t.description;
  const words = stripAccents(base)
    .toUpperCase()
    .replace(/[^A-Z ]/g, " ")
    .replace(/\b(LTDA|SA|S|A|ME|EIRELI|DE|DA|DO)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 3)
    .join(" ");
  return `${t.source}|${words}`;
}

/** Tolerância de valor para considerar "a mesma cobrança" (reajustes pequenos, câmbio). */
export function amountTolerance(amount: number): number {
  return Math.max(amount * 0.12, 0.5);
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(^|\s)(\p{L})/gu, (_, sp: string, c: string) => sp + c.toUpperCase());
}

function displayName(t: Transaction): string {
  const raw = isPix(t)
    ? (t.counterpart ?? t.description.replace(/^PIX\s+(ENVIADO|RECEBIDO)\s*/i, ""))
    : t.description;
  const clean = raw.replace(/\d{6,}/g, "").replace(/[*]/g, " ");
  return titleCase(clean).slice(0, 40);
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function detectRecurring(transactions: Transaction[], today: ISODate): RecurringExpense[] {
  const since = `${addMonths(monthOf(today), -LOOKBACK_MONTHS)}-01`;
  const candidates = transactions.filter(
    (t) =>
      t.amount < 0 &&
      t.kind === "regular" &&
      !(t.installment && t.installment.total > 1) &&
      t.date >= since &&
      t.date <= today &&
      Math.abs(t.amount) >= MIN_AMOUNT,
  );

  const groups = new Map<string, Transaction[]>();
  for (const t of candidates) {
    const k = recurringKey(t);
    groups.set(k, [...(groups.get(k) ?? []), t]);
  }

  const found: RecurringExpense[] = [];
  for (const [key, txs] of groups) {
    // Dentro da mesma origem, procura o "valor que se repete" (ex.: PIX de aluguel
    // para alguém a quem você também manda valores avulsos).
    let best: Transaction[] = [];
    let bestMonths = 0;
    for (const ref of txs) {
      const a = Math.abs(ref.amount);
      const cluster = txs.filter((t) => Math.abs(Math.abs(t.amount) - a) <= amountTolerance(a));
      const months = new Set(cluster.map((t) => monthOf(t.date))).size;
      if (months > bestMonths || (months === bestMonths && cluster.length < best.length)) {
        best = cluster;
        bestMonths = months;
      }
    }
    if (bestMonths < 2) continue;
    if (best.length / bestMonths > 1.5) continue; // frequente demais: é consumo, não mensalidade

    const sorted = [...best].sort((a, b) => (a.date < b.date ? 1 : -1));
    const last = sorted[0];
    if (diffDays(last.date, today) > ACTIVE_DAYS) continue;

    // Mensalidade cai sempre perto do mesmo dia (corridas e compras avulsas, não).
    const days = best.map((t) => parts(t.date).d);
    const typicalDay = median(days);
    const spread = Math.max(...days.map((d) => Math.min(Math.abs(d - typicalDay), 31 - Math.abs(d - typicalDay))));
    if (spread > 5) continue;

    // Só 2 meses: aceita se forem seguidos, com valor quase idêntico e no mesmo dia (cobrança nova).
    let recent = false;
    if (bestMonths < MIN_MONTHS) {
      const [m1, m2] = [...new Set(sorted.map((t) => monthOf(t.date)))];
      const amounts = best.map((t) => Math.abs(t.amount));
      const stable = Math.max(...amounts) - Math.min(...amounts) <= Math.max(...amounts) * 0.02;
      if (addMonths(m2, 1) !== m1 || !stable || spread > 3 || Math.abs(last.amount) < 20) continue;
      recent = true;
    }

    found.push({
      id: `${key}|${Math.round(Math.abs(last.amount))}`,
      key,
      name: displayName(last),
      amount: Math.abs(last.amount),
      method: last.source === "cartao" ? "cartao" : isPix(last) ? "pix" : "debito",
      day: Math.round(typicalDay),
      firstDate: sorted[sorted.length - 1].date,
      lastDate: last.date,
      months: bestMonths,
      recent,
    });
  }
  return found.sort((a, b) => b.amount - a.amount);
}

/** A transação é uma cobrança de algum gasto fixo detectado? */
export function matchRecurring(
  t: Pick<Transaction, "description" | "counterpart" | "source" | "paymentMethod" | "amount">,
  recurring: RecurringExpense[],
): RecurringExpense | undefined {
  const key = recurringKey(t);
  const amount = Math.abs(t.amount);
  return recurring.find((r) => r.key === key && Math.abs(amount - r.amount) <= amountTolerance(r.amount));
}

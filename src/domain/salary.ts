import { addMonths, clampedDate, diffDays, monthOf, parts } from "@/lib/dates";
import type { ISODate, Transaction } from "./types";

/**
 * Salário detectado a partir das transações, sem nada fixo no código:
 * - o empregador é a origem de crédito recorrente com a maior renda mensal;
 * - os dias de pagamento são aprendidos agrupando os dias do mês em que ele
 *   pagou (ex.: ~6 e ~19 → salário em duas partes);
 * - a parte maior é chamada de "Saldo", a menor de "Adiantamento".
 */

export type SalaryPart = { index: number; label: string; day: number };

export type SalaryPayment = {
  id: string;
  date: ISODate;
  amount: number;
  part: SalaryPart;
  description: string;
};

export type SalaryProfile = {
  employer: string;
  parts: SalaryPart[];
  payments: SalaryPayment[];
};

const stripAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Nome do pagador sem números (o CNPJ às vezes vem com dígitos diferentes). */
function payerKey(t: Transaction): string {
  return stripAccents(t.counterpart ?? t.description)
    .toUpperCase()
    .replace(/[^A-Z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 4)
    .join(" ");
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Dia "circular": pagamento no dia 29-31 conta como início do mês seguinte (ex.: 30 → 0). */
function cyclicDay(iso: ISODate): number {
  const { d } = parts(iso);
  return d >= 28 ? d - 31 : d;
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|\s)(\p{L})/gu, (_, sp: string, c: string) => sp + c.toUpperCase());
}

export function detectSalary(transactions: Transaction[], today: ISODate): SalaryProfile | null {
  const since = `${addMonths(monthOf(today), -4)}-01`;
  const credits = transactions.filter((t) => t.source === "conta" && t.amount > 0 && t.kind === "regular");

  // 1) Empregador: maior renda média mensal, presente em pelo menos 2 meses recentes.
  const groups = new Map<string, Transaction[]>();
  for (const t of credits) groups.set(payerKey(t), [...(groups.get(payerKey(t)) ?? []), t]);
  let employerKey: string | null = null;
  let bestMonthly = 0;
  for (const [key, txs] of groups) {
    const recent = txs.filter((t) => t.date >= since);
    const months = new Set(recent.map((t) => monthOf(t.date))).size;
    if (months < 2) continue;
    const monthly = recent.reduce((s, t) => s + t.amount, 0) / months;
    if (monthly > bestMonthly) {
      bestMonthly = monthly;
      employerKey = key;
    }
  }
  if (!employerKey) return null;
  const all = groups.get(employerKey)!;
  // Ignora créditos residuais do mesmo pagador (ex.: R$ 2,06 de ajuste).
  const typical = median(all.map((t) => t.amount));
  const txs = all.filter((t) => t.amount >= typical * 0.2).sort((a, b) => (a.date < b.date ? 1 : -1));

  // 2) Dias de pagamento: separa os dias em dois grupos pelo maior "buraco" entre eles
  //    e aceita duas partes se os centros ficarem bem separados e ambos forem frequentes.
  const days = txs.map((t) => cyclicDay(t.date)).sort((a, b) => a - b);
  let split = -1;
  let gap = 0;
  for (let i = 1; i < days.length; i++) {
    if (days[i] - days[i - 1] > gap) {
      gap = days[i] - days[i - 1];
      split = i;
    }
  }
  const minShare = Math.ceil(days.length * 0.25);
  const twoParts =
    split >= minShare &&
    days.length - split >= minShare &&
    median(days.slice(split)) - median(days.slice(0, split)) >= 8;
  const groupsOfDays = twoParts ? [days.slice(0, split), days.slice(split)] : [days];
  const centers = groupsOfDays.map((g) => median(g));
  const partIndexOf = (t: Transaction) => {
    const d = cyclicDay(t.date);
    let best = 0;
    for (let i = 1; i < centers.length; i++) if (Math.abs(d - centers[i]) < Math.abs(d - centers[best])) best = i;
    return best;
  };

  // 3) Nomes: com duas partes, a de maior valor típico é o "Saldo".
  const amountsByPart = centers.map((_, i) => median(txs.filter((t) => partIndexOf(t) === i).map((t) => t.amount)));
  const biggest = amountsByPart.indexOf(Math.max(...amountsByPart));
  const salaryParts: SalaryPart[] = centers.map((c, i) => ({
    index: i,
    label: centers.length === 1 ? "Salário" : i === biggest ? "Saldo" : "Adiantamento",
    day: Math.max(1, Math.round(c < 1 ? c + 31 : c)),
  }));

  return {
    employer: titleCase(txs[0].counterpart ?? txs[0].description).slice(0, 40),
    parts: salaryParts,
    payments: txs.map((t) => ({
      id: t.id,
      date: t.date,
      amount: t.amount,
      part: salaryParts[partIndexOf(t)],
      description: t.description,
    })),
  };
}

/** Próxima data de pagamento depois de `date`, pelos dias aprendidos. */
function nextPaymentAfter(date: ISODate, profile: SalaryProfile): { date: ISODate; part: SalaryPart } {
  const { y, m } = parts(date);
  const options = [0, 1, 2].flatMap((offset) =>
    profile.parts.map((p) => {
      // Parte paga perto da virada do mês (dia ≥ 28) pertence ao mês anterior no calendário.
      const d = clampedDate(y, m + offset, p.day);
      return { date: d, part: p };
    }),
  );
  // Margem de 5 dias: um pagamento adiantado não faz "pular" a próxima data.
  return options.filter((o) => diffDays(date, o.date) > 5).sort((a, b) => (a.date < b.date ? -1 : 1))[0];
}

export type SalarySummary = {
  employer: string | null;
  last: SalaryPayment | null;
  thisMonthTotal: number;
  lastFullMonthTotal: number | null;
  next: { label: string; expectedDate: ISODate; estimatedAmount: number | null } | null;
};

export function summarizeSalary(today: ISODate, profile: SalaryProfile | null): SalarySummary {
  if (!profile) return { employer: null, last: null, thisMonthTotal: 0, lastFullMonthTotal: null, next: null };
  const month = monthOf(today);
  const sumMonth = (ym: string) => profile.payments.filter((p) => monthOf(p.date) === ym).reduce((s, p) => s + p.amount, 0);
  const last = profile.payments.find((p) => p.date <= today) ?? null;
  const next = last ? nextPaymentAfter(last.date, profile) : null;
  const prev = sumMonth(addMonths(month, -1));
  return {
    employer: profile.employer,
    last,
    thisMonthTotal: sumMonth(month),
    lastFullMonthTotal: prev > 0 ? prev : null,
    next: next
      ? {
          label: next.part.label,
          expectedDate: next.date,
          // Estimativa = último pagamento da mesma parte.
          estimatedAmount: profile.payments.find((p) => p.part.index === next.part.index)?.amount ?? null,
        }
      : null,
  };
}

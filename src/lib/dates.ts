/**
 * Utilitários de data trabalhando com strings "YYYY-MM-DD" no fuso de São Paulo.
 * Evitamos objetos Date na lógica de negócio porque o servidor (Vercel) roda em
 * UTC e o celular roda em BRT — strings ISO deixam as contas determinísticas.
 */
import type { ISODate, YearMonth } from "@/domain/types";

export const TIMEZONE = "America/Sao_Paulo";

const spDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Data de hoje em São Paulo. */
export function todayISO(now: Date = new Date()): ISODate {
  return spDateFormatter.format(now);
}

/**
 * Converte um datetime ISO vindo de uma API para a data em São Paulo.
 * Datas "puras" (meia-noite UTC) são mantidas como estão.
 */
export function toSPDate(value: string | Date): ISODate {
  const iso = typeof value === "string" ? value : value.toISOString();
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso) || /T00:00:00(\.000)?Z$/.test(iso)) return iso.slice(0, 10);
  return spDateFormatter.format(new Date(iso));
}

export function parts(iso: ISODate): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

/** Monta uma data ISO normalizando estouros (ex.: mês 13 vira janeiro do ano seguinte). */
export function fromParts(y: number, m: number, d: number): ISODate {
  return new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Dia `day` do mês, limitado ao último dia (ex.: dia 30 em fevereiro vira 28/29). */
export function clampedDate(y: number, m: number, day: number): ISODate {
  const norm = parts(fromParts(y, m, 1));
  return fromParts(norm.y, norm.m, Math.min(day, daysInMonth(norm.y, norm.m)));
}

export function addDays(iso: ISODate, n: number): ISODate {
  const { y, m, d } = parts(iso);
  return fromParts(y, m, d + n);
}

export function monthOf(iso: ISODate): YearMonth {
  return iso.slice(0, 7);
}

export function addMonths(ym: YearMonth, n: number): YearMonth {
  const [y, m] = ym.split("-").map(Number);
  return fromParts(y, m + n, 1).slice(0, 7);
}

export function monthDiff(from: YearMonth, to: YearMonth): number {
  const [y1, m1] = from.split("-").map(Number);
  const [y2, m2] = to.split("-").map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
}

export function diffDays(from: ISODate, to: ISODate): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** 0 = domingo ... 6 = sábado */
export function weekday(iso: ISODate): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

/** Segunda-feira da semana da data. */
export function startOfWeek(iso: ISODate): ISODate {
  const wd = weekday(iso);
  return addDays(iso, wd === 0 ? -6 : 1 - wd);
}

export function startOfMonth(iso: ISODate): ISODate {
  return `${monthOf(iso)}-01`;
}

export function endOfMonth(iso: ISODate): ISODate {
  const { y, m } = parts(iso);
  return fromParts(y, m, daysInMonth(y, m));
}

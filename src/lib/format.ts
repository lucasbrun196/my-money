/** Formatação no padrão brasileiro: R$ 1.234,56 · 12,34% · 13/10/2026 */
import type { ISODate, YearMonth } from "@/domain/types";

const brlFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const usdFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD" });
const pctFmt = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const pct1Fmt = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 });

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** Normaliza o espaço não separável do Intl para um espaço comum (evita quebras estranhas em testes/cópia). */
const clean = (s: string) => s.replace(/ /g, " ");

export function brl(value: number): string {
  return clean(brlFmt.format(value));
}

export function usd(value: number): string {
  return clean(usdFmt.format(value));
}

export function signedBrl(value: number): string {
  const s = brl(Math.abs(value));
  if (Math.abs(value) < 0.005) return s;
  return value > 0 ? `+${s}` : `−${s}`;
}

export function signedUsd(value: number): string {
  const s = usd(Math.abs(value));
  if (Math.abs(value) < 0.005) return s;
  return value > 0 ? `+${s}` : `−${s}`;
}

/** 0.1234 -> "12,34%" */
export function pct(ratio: number): string {
  return clean(pctFmt.format(ratio));
}

export function pctShort(ratio: number): string {
  return clean(pct1Fmt.format(ratio));
}

export function signedPct(ratio: number): string {
  const s = pct(Math.abs(ratio));
  if (Math.abs(ratio) < 0.00005) return s;
  return ratio > 0 ? `+${s}` : `−${s}`;
}

export function quantity(value: number, maxDigits = 8): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: maxDigits }).format(value);
}

/** "2026-10-13" -> "13/10/2026" */
export function dateBR(iso: ISODate): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** "2026-10-13" -> "13 out" */
export function dateShort(iso: ISODate): string {
  const [, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]}`;
}

/** "2026-10-13" -> "seg, 13 out" */
export function dateWithWeekday(iso: ISODate): string {
  const wd = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return `${WEEKDAYS[wd]}, ${dateShort(iso)}`;
}

/** "2026-10" -> "out/2026" */
export function monthLabel(ym: YearMonth): string {
  const [y, m] = ym.split("-");
  return `${MONTHS[Number(m) - 1]}/${y}`;
}

/** "2026-10" -> "out" */
export function monthShort(ym: YearMonth): string {
  return MONTHS[Number(ym.split("-")[1]) - 1];
}

export function weekdayShort(iso: ISODate): string {
  return WEEKDAYS[new Date(`${iso}T00:00:00Z`).getUTCDay()];
}

/** Datetime ISO -> "13/10 às 14:32" no fuso de São Paulo. */
export function dateTimeBR(isoDateTime: string): string {
  const d = new Date(isoDateTime);
  const date = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
  }).format(d);
  const time = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
  return `${date} às ${time}`;
}

/** Rótulo curto para eixos de gráfico: 850 → "850", 2200 → "2,2k". */
export function axisShort(value: number): string {
  if (Math.abs(value) < 1000) return String(Math.round(value));
  return `${(value / 1000).toFixed(1).replace(".", ",").replace(",0", "")}k`;
}

const MONTHS_LONG = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "2026-10" -> "outubro de 2026" */
export function monthLong(ym: YearMonth): string {
  const [y, m] = ym.split("-");
  return `${MONTHS_LONG[Number(m) - 1]} de ${y}`;
}

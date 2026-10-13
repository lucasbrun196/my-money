/** Períodos do filtro de gastos (dia, semana, mês, ano) — código puro, roda no cliente. */
import {
  addDays,
  addMonths,
  endOfMonth,
  fromParts,
  monthOf,
  parts,
  startOfMonth,
  startOfWeek,
} from "@/lib/dates";
import { dateBR, dateShort, monthLabel } from "@/lib/format";
import type { ISODate } from "./types";

export type PeriodKind = "dia" | "semana" | "mes" | "ano";

export type PeriodRange = {
  kind: PeriodKind;
  start: ISODate;
  /** Fim inclusivo. */
  end: ISODate;
  label: string;
};

export function periodRange(kind: PeriodKind, anchor: ISODate): PeriodRange {
  switch (kind) {
    case "dia":
      return { kind, start: anchor, end: anchor, label: dateBR(anchor) };
    case "semana": {
      const start = startOfWeek(anchor);
      const end = addDays(start, 6);
      return { kind, start, end, label: `${dateShort(start)} – ${dateShort(end)}` };
    }
    case "mes":
      return { kind, start: startOfMonth(anchor), end: endOfMonth(anchor), label: monthLabel(monthOf(anchor)) };
    case "ano": {
      const { y } = parts(anchor);
      return { kind, start: fromParts(y, 1, 1), end: fromParts(y, 12, 31), label: String(y) };
    }
  }
}

export function shiftAnchor(kind: PeriodKind, anchor: ISODate, dir: -1 | 1): ISODate {
  switch (kind) {
    case "dia":
      return addDays(anchor, dir);
    case "semana":
      return addDays(anchor, 7 * dir);
    case "mes":
      return `${addMonths(monthOf(anchor), dir)}-01`;
    case "ano": {
      const { y } = parts(anchor);
      return fromParts(y + dir, 1, 1);
    }
  }
}

/** Sub-períodos para o gráfico de barras: meses no ano, dias no mês/semana. */
export function buckets(range: PeriodRange): { key: string; label: string; start: ISODate; end: ISODate }[] {
  if (range.kind === "ano") {
    const out = [];
    let ym = monthOf(range.start);
    for (let i = 0; i < 12; i++) {
      out.push({ key: ym, label: monthLabel(ym).slice(0, 3), start: `${ym}-01`, end: endOfMonth(`${ym}-01`) });
      ym = addMonths(ym, 1);
    }
    return out;
  }
  const out = [];
  for (let d = range.start; d <= range.end; d = addDays(d, 1)) {
    out.push({ key: d, label: String(parts(d).d), start: d, end: d });
  }
  return out;
}

/** Indicadores de mercado exibidos no painel de investimentos (serializáveis para o cliente). */

export type IndicatorGroup = "Minhas ações" | "Índices" | "Juros e inflação" | "Moedas" | "Cripto";

/**
 * Como formatar o valor:
 * - brl: R$ 26,35 · fx: R$ 5,0213 (câmbio, mais casas) · pct: 13,75% · points: 206.754 pts
 */
export type IndicatorUnit = "brl" | "fx" | "pct" | "points";

export type IndicatorPoint = { date: string; value: number };

export type Indicator = {
  id: string;
  group: IndicatorGroup;
  label: string;
  subtitle?: string;
  unit: IndicatorUnit;
  value: number;
  /** Variação no dia (quando a fonte informa). */
  changeAbs: number | null;
  changePct: number | null;
  /** Momento da última cotação (ISO). */
  asOf: string;
  history: IndicatorPoint[];
  /** Ex.: limite de histórico do plano grátis. */
  historyNote?: string;
  stats: { label: string; value: string }[];
  source: string;
};

export const GROUP_ORDER: IndicatorGroup[] = ["Minhas ações", "Índices", "Juros e inflação", "Moedas", "Cripto"];

const DECIMALS: Record<IndicatorUnit, number> = { brl: 2, fx: 4, pct: 2, points: 0 };

/** Formata um valor do indicador no padrão brasileiro. */
export function formatIndicator(value: number, unit: IndicatorUnit): string {
  // Moedas muito "pequenas" (ex.: peso argentino ≈ R$ 0,0033) precisam de mais casas.
  const digits = unit === "fx" && Math.abs(value) < 0.1 ? 6 : DECIMALS[unit];
  const n = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
  switch (unit) {
    case "brl":
    case "fx":
      return `R$ ${n}`;
    case "pct":
      return `${n}%`;
    case "points":
      return `${n} pts`;
  }
}

/** Variação entre o primeiro e o último ponto de um período. */
export function periodChange(points: IndicatorPoint[], unit: IndicatorUnit): { abs: number; pct: number | null } | null {
  if (points.length < 2) return null;
  const first = points[0].value;
  const last = points[points.length - 1].value;
  // Para taxas (%), a variação relevante é em pontos percentuais.
  return { abs: last - first, pct: unit === "pct" || first === 0 ? null : (last - first) / first };
}

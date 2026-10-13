import type { AssetClass, CryptoSnapshot, InvestmentPosition } from "./types";
import { round2 } from "./spending";

export const ASSET_CLASS_LABEL: Record<AssetClass, string> = {
  renda_fixa: "Renda fixa",
  acoes: "Ações",
  exterior: "Exterior",
  cripto: "Cripto",
  caixa: "Conta corrente",
};

/** Ordem fixa das classes = ordem fixa das cores nos gráficos. */
export const ASSET_CLASS_ORDER: AssetClass[] = ["renda_fixa", "acoes", "exterior", "cripto", "caixa"];

export type PortfolioRow = InvestmentPosition & {
  weight: number;
  pnl: number | null;
  pnlPct: number | null;
};

export type PortfolioSummary = {
  total: number;
  invested: number;
  pnl: number;
  pnlPct: number | null;
  rows: PortfolioRow[];
  byClass: { assetClass: AssetClass; value: number; weight: number }[];
};

export function positionPnl(p: InvestmentPosition): { pnl: number | null; pnlPct: number | null } {
  if (p.invested == null || p.invested <= 0) return { pnl: null, pnlPct: null };
  const pnl = p.value - p.invested;
  return { pnl: round2(pnl), pnlPct: pnl / p.invested };
}

export function summarizePortfolio(positions: InvestmentPosition[]): PortfolioSummary {
  const total = positions.reduce((s, p) => s + p.value, 0);
  const rows = positions
    .map((p) => ({ ...p, weight: total > 0 ? p.value / total : 0, ...positionPnl(p) }))
    .sort((a, b) => b.value - a.value);

  const withCost = rows.filter((r) => r.pnl != null);
  const invested = withCost.reduce((s, r) => s + (r.invested ?? 0), 0);
  const pnl = withCost.reduce((s, r) => s + (r.pnl ?? 0), 0);

  return {
    total: round2(total),
    invested: round2(invested),
    pnl: round2(pnl),
    pnlPct: invested > 0 ? pnl / invested : null,
    rows,
    byClass: classBreakdown(rows.map((r) => ({ assetClass: r.assetClass, value: r.value }))),
  };
}

export function classBreakdown(items: { assetClass: AssetClass; value: number }[]) {
  const total = items.reduce((s, i) => s + i.value, 0);
  return ASSET_CLASS_ORDER.map((assetClass) => {
    const value = items.filter((i) => i.assetClass === assetClass).reduce((s, i) => s + i.value, 0);
    return { assetClass, value: round2(value), weight: total > 0 ? value / total : 0 };
  }).filter((c) => c.value > 0);
}

export type NetWorth = {
  total: number;
  byClass: { assetClass: AssetClass; value: number; weight: number }[];
};

export function computeNetWorth(input: {
  checkingBalance: number | null;
  includeChecking: boolean;
  positions: InvestmentPosition[];
  crypto: CryptoSnapshot | null;
}): NetWorth {
  const items: { assetClass: AssetClass; value: number }[] = input.positions.map((p) => ({
    assetClass: p.assetClass,
    value: p.value,
  }));
  if (input.crypto) items.push({ assetClass: "cripto", value: input.crypto.totalBrl });
  if (input.includeChecking && input.checkingBalance != null && input.checkingBalance > 0) {
    items.push({ assetClass: "caixa", value: input.checkingBalance });
  }
  const byClass = classBreakdown(items);
  return { total: round2(byClass.reduce((s, c) => s + c.value, 0)), byClass };
}

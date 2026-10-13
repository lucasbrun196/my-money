import type { CryptoHolding, CryptoSnapshot, PriceMap } from "./types";
import { round2 } from "./spending";

export type CryptoBalance = { asset: string; spot: number; earn: number };

export type CryptoPrices = {
  /** Preço em R$ por ativo (ex.: BTC -> 612000). */
  brl: PriceMap;
  /** Preço em US$ (via par USDT) por ativo. */
  usd: PriceMap;
  /** Cotação do dólar usada nas conversões (USDT/BRL). */
  usdBrl: number;
};

/** Evento que altera a posição: compra (com custo) ou venda. Preço em US$. */
export type CostEvent = { asset: string; time: number; qty: number; priceUsd: number; side: "buy" | "sell" };

export type CostBasis = {
  avgPriceUsd: number;
  /** Quantidade que tem custo conhecido (compras rastreadas − vendas). */
  trackedQty: number;
};

/**
 * Preço médio ponderado (método do custo médio): compras somam custo e
 * quantidade; vendas reduzem a quantidade pelo preço médio vigente.
 */
export function averageCost(events: CostEvent[]): Record<string, CostBasis> {
  const state = new Map<string, { qty: number; cost: number }>();
  for (const e of [...events].sort((a, b) => a.time - b.time)) {
    const s = state.get(e.asset) ?? { qty: 0, cost: 0 };
    if (e.side === "buy") {
      s.qty += e.qty;
      s.cost += e.qty * e.priceUsd;
    } else if (s.qty > 0) {
      const avg = s.cost / s.qty;
      const sold = Math.min(e.qty, s.qty);
      s.qty -= sold;
      s.cost -= sold * avg;
    }
    state.set(e.asset, s);
  }
  return Object.fromEntries(
    [...state.entries()]
      .filter(([, s]) => s.qty > 0)
      .map(([asset, s]) => [asset, { avgPriceUsd: s.cost / s.qty, trackedQty: s.qty }]),
  );
}

/**
 * Monta a carteira cripto. O preço médio está em US$, então o resultado é
 * calculado em US$ e convertido para R$ pelo câmbio atual (aproximação).
 */
export function buildCryptoSnapshot(
  balances: CryptoBalance[],
  prices: CryptoPrices,
  costBasis: Record<string, CostBasis>,
): CryptoSnapshot {
  const holdings: CryptoHolding[] = balances.map(({ asset, spot, earn }) => {
    const quantity = spot + earn;
    const priceUsd = prices.usd[asset] ?? 0;
    const priceBrl = prices.brl[asset] ?? priceUsd * prices.usdBrl;
    const valueUsd = quantity * priceUsd;
    const basis = costBasis[asset];
    const avgPriceUsd = basis?.avgPriceUsd ?? null;
    const pnlUsd = avgPriceUsd != null ? valueUsd - quantity * avgPriceUsd : null;
    return {
      asset,
      spot,
      earn,
      quantity,
      priceBrl,
      priceUsd,
      valueBrl: round2(quantity * priceBrl),
      valueUsd: round2(valueUsd),
      avgPriceUsd,
      pnlUsd: pnlUsd != null ? round2(pnlUsd) : null,
      pnlBrl: pnlUsd != null ? round2(pnlUsd * prices.usdBrl) : null,
      pnlPct: avgPriceUsd ? (priceUsd - avgPriceUsd) / avgPriceUsd : null,
      costCoverage: basis && quantity > 0 ? Math.min(basis.trackedQty / quantity, 1) : 0,
    };
  });

  return {
    holdings: holdings.sort((a, b) => b.valueBrl - a.valueBrl),
    totalBrl: round2(holdings.reduce((s, h) => s + h.valueBrl, 0)),
    totalUsd: round2(holdings.reduce((s, h) => s + h.valueUsd, 0)),
    usdBrl: prices.usdBrl,
  };
}

import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { financeConfig } from "@/config/finance";
import { averageCost, buildCryptoSnapshot, type CostBasis, type CryptoBalance, type CryptoPrices } from "@/domain/crypto";
import type { CryptoSnapshot, Sourced } from "@/domain/types";
import { CACHE_TAGS } from "@/server/cache-tags";
import { configured } from "@/server/env";
import { errorMessage } from "@/server/http";
import { getAllBalances, getCostEvents, getTickerPrices, NON_CRYPTO_ASSETS } from "@/server/integrations/binance/client";
import type { CryptoRepository } from "../types";

async function cachedBalances(): Promise<CryptoBalance[]> {
  "use cache: remote";
  cacheTag(CACHE_TAGS.binance);
  cacheLife("balances");
  return getAllBalances();
}

async function cachedPrices(symbols: string[]): Promise<{ prices: Record<string, number>; fetchedAt: string }> {
  "use cache: remote";
  cacheTag(CACHE_TAGS.prices);
  cacheLife("prices");
  return { prices: await getTickerPrices(symbols), fetchedAt: new Date().toISOString() };
}

/** Histórico de compras é pesado (dezenas de chamadas): recalcula a cada 12 h ou no botão Atualizar. */
async function cachedCostBasis(assets: string[]): Promise<Record<string, CostBasis>> {
  "use cache: remote";
  cacheTag(CACHE_TAGS.binance);
  cacheLife("reference");
  return averageCost(await getCostEvents(assets));
}

function toPrices(assets: string[], raw: Record<string, number>): CryptoPrices {
  const usdBrl = raw.USDTBRL;
  if (!usdBrl) throw new Error("Binance: cotação USDT/BRL indisponível");
  const brl: Record<string, number> = {};
  const usd: Record<string, number> = {};
  for (const a of assets) {
    if (raw[`${a}BRL`]) brl[a] = raw[`${a}BRL`];
    if (raw[`${a}USDT`]) usd[a] = raw[`${a}USDT`];
  }
  return { brl, usd, usdBrl };
}

const EMPTY: CryptoSnapshot = { holdings: [], totalBrl: 0, totalUsd: 0, usdBrl: 0 };

export const liveCryptoRepository: CryptoRepository = {
  async getSnapshot(): Promise<Sourced<CryptoSnapshot>> {
    const now = new Date().toISOString();
    if (!configured.binance()) {
      return {
        data: EMPTY,
        source: "unconfigured",
        fetchedAt: now,
        notes: ["Configure BINANCE_API_KEY e BINANCE_API_SECRET (veja docs/03-binance.md)."],
      };
    }

    try {
      const ignore = new Set(financeConfig.crypto.ignoreAssets);
      const balances = (await cachedBalances()).filter((b) => !NON_CRYPTO_ASSETS.has(b.asset) && !ignore.has(b.asset));
      const assets = balances.map((b) => b.asset).sort();
      const { prices: raw, fetchedAt } = await cachedPrices([
        ...assets.flatMap((a) => [`${a}BRL`, `${a}USDT`]),
        "USDTBRL",
      ]);
      const prices = toPrices(assets, raw);

      // Descarta "poeira" (menos de R$ 1) para não poluir a tela.
      const relevant = balances.filter((b) => {
        const p = prices.brl[b.asset] ?? (prices.usd[b.asset] ?? 0) * prices.usdBrl;
        return (b.spot + b.earn) * p >= 1;
      });

      const notes: string[] = [];
      let basis: Record<string, CostBasis> = {};
      try {
        basis = await cachedCostBasis(relevant.map((b) => b.asset).sort());
      } catch (err) {
        notes.push(`Preço médio indisponível: ${errorMessage(err)}`);
      }

      const data = buildCryptoSnapshot(relevant, prices, basis);
      for (const h of data.holdings) {
        if (h.avgPriceUsd == null) notes.push(`${h.asset}: nenhuma compra encontrada no histórico da Binance (sem preço médio).`);
        else if (h.costCoverage < 0.95)
          notes.push(
            `${h.asset}: o preço médio considera ${Math.round(h.costCoverage * 100)}% da quantidade; o restante veio de rendimentos do Earn, depósitos ou compras P2P (sem custo registrado).`,
          );
      }
      return { data, source: "live", fetchedAt, notes };
    } catch (err) {
      return { data: EMPTY, source: "error", fetchedAt: now, notes: [errorMessage(err)] };
    }
  },
};

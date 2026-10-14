import "server-only";
import { after } from "next/server";
import { cache } from "react";
import { financeConfig } from "@/config/finance";
import { computeNetWorth, summarizePortfolio } from "@/domain/portfolio";
import { summarizeReserves } from "@/domain/reserves";
import { getRepositories } from "@/server/repositories";
import { getBankingView } from "./banking";
import { getCryptoData, getInvestmentsData } from "./data";

export const getPortfolioView = cache(async () => {
  const sourced = await getInvestmentsData();
  return { sourced, summary: summarizePortfolio(sourced.data) };
});

export const getNetWorthView = cache(async () => {
  const [bank, investments, crypto] = await Promise.all([getBankingView(), getInvestmentsData(), getCryptoData()]);

  const netWorth = computeNetWorth({
    checkingBalance: bank.checking?.balance ?? null,
    includeChecking: financeConfig.netWorth.includeChecking,
    positions: investments.data,
    crypto: crypto.data.holdings.length > 0 ? crypto.data : null,
  });

  // Ponto de integração do Firebase: grava a foto diária do patrimônio depois
  // de responder (não atrasa a página). Hoje o repositório é um no-op.
  const history = getRepositories().history;
  if (history.enabled) {
    after(() =>
      history.saveDailySnapshot({
        date: bank.today,
        netWorth: netWorth.total,
        byClass: Object.fromEntries(netWorth.byClass.map((c) => [c.assetClass, c.value])),
        checkingBalance: bank.checking?.balance ?? null,
      }),
    );
  }

  const sources = [bank.sourced.source, investments.source, crypto.source];
  const missing = [
    ...(bank.checking ? [] : ["conta corrente"]),
    ...(investments.data.length > 0 ? [] : ["XP"]),
    ...(crypto.data.holdings.length > 0 ? [] : ["Binance"]),
  ];
  return { netWorth, sources, missing, fetchedAt: bank.sourced.fetchedAt, today: bank.today };
});

/** Conexão do Open Finance onde ficam as "Minhas reservas" (rótulo do item, ver repositories/live/investments). */
const RESERVES_CONNECTION = "Santander";

/** "Minhas reservas" do Santander, deduzidas das aplicações de renda fixa da conexão do banco. */
export const getReservesView = cache(async () => {
  const [bank, investments] = await Promise.all([getBankingView(), getInvestmentsData()]);
  return {
    summary: summarizeReserves({
      positions: investments.data,
      connection: RESERVES_CONNECTION,
      reservedBalances: bank.checking?.reserved,
    }),
    sourced: investments,
    today: bank.today,
  };
});

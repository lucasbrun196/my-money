import "server-only";
import { after } from "next/server";
import { cache } from "react";
import { financeConfig } from "@/config/finance";
import { evaluateGoals } from "@/domain/goals";
import { computeNetWorth, summarizePortfolio } from "@/domain/portfolio";
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
        fortnightSpent: bank.hasData ? bank.budget.spent : null,
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

export const getGoalsView = cache(async () => {
  const [bank, investments] = await Promise.all([getBankingView(), getInvestmentsData()]);
  return evaluateGoals(financeConfig.goals, {
    reserved: bank.checking?.reserved ?? null,
    positions: investments.data,
    currentBill: bank.hasData && bank.card ? bank.card.currentTotal : null,
  });
});

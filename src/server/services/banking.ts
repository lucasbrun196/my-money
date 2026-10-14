import "server-only";
import { cache } from "react";
import { financeConfig } from "@/config/finance";
import { inferCardCycle, summarizeCard } from "@/domain/credit-card";
import { detectRecurring } from "@/domain/recurring";
import { detectSalary, summarizeSalary } from "@/domain/salary";
import { buildExpenses } from "@/domain/spending";
import { getBankData, getToday } from "./data";

/**
 * Tudo que as telas precisam do Santander, calculado uma vez por requisição.
 * Salário, gastos fixos e ciclo do cartão são DEDUZIDOS das transações e
 * faturas — nada disso fica escrito no código.
 */
export const getBankingView = cache(async () => {
  const [today, sourced] = await Promise.all([getToday(), getBankData()]);
  const { transactions, bills, card, checking } = sourced.data;

  const recurring = detectRecurring(transactions, today);
  const expenses = buildExpenses(transactions, recurring);
  const salaryProfile = detectSalary(transactions, today);
  const salary = summarizeSalary(today, salaryProfile);

  const cycle = inferCardCycle(bills, card);
  const cardSummary = cycle
    ? summarizeCard({
        transactions,
        today,
        cycle,
        recurring,
        waiverTarget: financeConfig.creditCard.annualFeeWaiverTarget,
        bills,
        card,
      })
    : null;

  return {
    sourced,
    today,
    hasData: sourced.source === "live" || sourced.source === "demo",
    checking,
    expenses,
    recurring,
    salary,
    cycle,
    card: cardSummary,
    cardInfo: card,
    bills,
  };
});

export type BankingView = Awaited<ReturnType<typeof getBankingView>>;

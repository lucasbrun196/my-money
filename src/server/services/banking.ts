import "server-only";
import { cache } from "react";
import { financeConfig } from "@/config/finance";
import { inferCardCycle, resolveBillMonth, summarizeCard } from "@/domain/credit-card";
import { fixedExpensesStatus, monthlyFixedTotal } from "@/domain/fixed-expenses";
import { detectRecurring } from "@/domain/recurring";
import { currentFortnight, detectSalary, summarizeSalary } from "@/domain/salary";
import { buildExpenses, fortnightBudget } from "@/domain/spending";
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
  const fortnight = currentFortnight(today, salaryProfile);
  const budget = fortnightBudget(expenses, fortnight, today, financeConfig.budget);
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
  const fixed = fixedExpensesStatus(
    recurring,
    transactions,
    today,
    cardSummary?.currentMonth ?? "",
    (t) => (cycle ? resolveBillMonth(t, cycle) : ""),
  );

  return {
    sourced,
    today,
    hasData: sourced.source === "live" || sourced.source === "demo",
    checking,
    expenses,
    recurring,
    fortnight,
    budget,
    salary,
    cycle,
    card: cardSummary,
    cardInfo: card,
    bills,
    fixed,
    fixedMonthlyTotal: monthlyFixedTotal(recurring),
  };
});

export type BankingView = Awaited<ReturnType<typeof getBankingView>>;

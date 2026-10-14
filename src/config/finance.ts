/**
 * Preferências do MyMoney.
 *
 * Aqui NÃO há dados financeiros: saldo, salário, gastos fixos, ciclo do
 * cartão, posições, reservas e preço médio vêm das APIs (Pluggy e Binance).
 * Ficam só as decisões pessoais que nenhuma API conhece, como a meta da anuidade.
 */

export const financeConfig = {
  timezone: "America/Sao_Paulo",

  /** Meta de gasto por fatura para isenção da anuidade do cartão. */
  creditCard: {
    annualFeeWaiverTarget: 2000,
  },

  /** Binance: ativos que você não quer acompanhar (stablecoins já são ignoradas). */
  crypto: {
    ignoreAssets: ["BNB"],
  },

  netWorth: {
    /** Inclui o saldo da conta corrente no patrimônio (classe "Conta corrente"). */
    includeChecking: true,
  },
};

export type FinanceConfig = typeof financeConfig;

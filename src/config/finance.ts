/**
 * Preferências do MyMoney.
 *
 * Aqui NÃO há dados financeiros: saldo, salário, gastos fixos, ciclo do
 * cartão, posições e preço médio vêm das APIs (Pluggy e Binance). Ficam só
 * as decisões pessoais que nenhuma API conhece, como o teto de gastos e
 * as metas.
 */

/** Valida cada item contra o tipo e mantém o array com o tipo amplo (não literal). */
const typed = <T,>(list: T[]): T[] => list;

export const financeConfig = {
  timezone: "America/Sao_Paulo",

  /** Teto de gastos variáveis por quinzena (de um salário até o próximo). */
  budget: {
    limitPerFortnight: 900,
    /** A partir de qual % do teto o card fica amarelo / vermelho. */
    warnAt: 0.7,
    dangerAt: 0.9,
    /**
     * Compras parceladas no cartão: "first-installment" conta só o valor da
     * parcela 1 na data da compra; "full-amount" conta o valor total da compra.
     */
    installmentPolicy: "first-installment" as "first-installment" | "full-amount",
  },

  /** Meta de gasto por fatura para isenção da anuidade do cartão. */
  creditCard: {
    annualFeeWaiverTarget: 2000,
  },

  goals: typed<GoalConfig>([
    {
      id: "viagem",
      name: "Caixinha da viagem",
      target: 4000,
      // Caixinha/saldo reservado no Open Finance cujo nome contém "viagem".
      source: { type: "reserved-balance", nameContains: "viagem" },
    },
    {
      id: "reserva",
      name: "Reserva de emergência",
      target: 20000,
      // Soma de todos os investimentos de renda fixa vindos do Open Finance.
      source: { type: "asset-class", assetClass: "renda_fixa" },
    },
    {
      id: "fatura",
      name: "Fatura ≥ R$ 2.000 (anuidade)",
      target: 2000,
      source: { type: "current-bill" },
    },
  ]),

  /** Binance: ativos que você não quer acompanhar (stablecoins já são ignoradas). */
  crypto: {
    ignoreAssets: ["BNB"],
  },

  netWorth: {
    /** Inclui o saldo da conta corrente no patrimônio (classe "Conta corrente"). */
    includeChecking: true,
  },
};

export type GoalConfig = {
  id: string;
  name: string;
  target: number;
  source:
    | { type: "reserved-balance"; nameContains: string }
    | { type: "asset-class"; assetClass: "renda_fixa" | "acoes" | "exterior" | "cripto" | "caixa" }
    | { type: "current-bill" };
};

export type FinanceConfig = typeof financeConfig;

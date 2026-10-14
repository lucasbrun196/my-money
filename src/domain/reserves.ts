import { round2 } from "./spending";
import type { ISODate, InvestmentPosition } from "./types";

/**
 * "Minhas reservas" do banco. No Open Finance elas não chegam com o nome dado
 * no app: cada reserva é uma aplicação de renda fixa (CDB) da conexão do banco,
 * e eventuais "saldos reservados" vêm junto da conta corrente. Tudo aqui é
 * deduzido desses dados, sem nenhum valor fixo.
 */
export type Reserve = {
  id: string;
  /** Nome vindo do banco (saldo reservado) ou "Reserva N", pela ordem de aplicação. */
  label: string;
  /** Nome do produto (ex.: "CDB - BANCO ..."). */
  product?: string;
  value: number;
  invested: number | null;
  profit: number | null;
  purchaseDate?: ISODate;
  dueDate?: ISODate;
  liquidFrom?: ISODate;
  rateLabel?: string;
};

export type ReservesSummary = {
  items: Reserve[];
  total: number;
  invested: number | null;
  profit: number | null;
};

export function summarizeReserves(input: {
  positions: InvestmentPosition[];
  /** Conexão do Open Finance do banco das reservas (rótulo do item). */
  connection: string;
  reservedBalances?: { name: string; amount: number }[];
}): ReservesSummary {
  const applications = input.positions
    .filter((p) => p.connection === input.connection && p.assetClass === "renda_fixa" && p.value > 0)
    .sort((a, b) => {
      const da = a.fixedIncome?.purchaseDate ?? "9999";
      const db = b.fixedIncome?.purchaseDate ?? "9999";
      return da === db ? (a.id < b.id ? -1 : 1) : da < db ? -1 : 1;
    });

  const items: Reserve[] = [
    ...(input.reservedBalances ?? [])
      .filter((r) => r.amount > 0)
      .map((r, i) => ({ id: `saldo-${i}`, label: r.name, value: r.amount, invested: null, profit: null })),
    ...applications.map((p, i) => ({
      id: p.id,
      label: `Reserva ${i + 1}`,
      product: p.name,
      value: p.value,
      invested: p.invested,
      profit: p.invested != null ? round2(p.value - p.invested) : null,
      purchaseDate: p.fixedIncome?.purchaseDate,
      dueDate: p.fixedIncome?.dueDate,
      liquidFrom: p.fixedIncome?.liquidFrom,
      rateLabel: p.fixedIncome?.rateLabel,
    })),
  ];

  const known = items.filter((r) => r.invested != null);
  const allKnown = items.length > 0 && known.length === items.length;
  const invested = allKnown ? round2(known.reduce((s, r) => s + (r.invested ?? 0), 0)) : null;
  const total = round2(items.reduce((s, r) => s + r.value, 0));
  return { items, total, invested, profit: invested != null ? round2(total - invested) : null };
}

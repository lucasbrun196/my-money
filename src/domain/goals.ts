import type { GoalConfig } from "@/config/finance";
import type { InvestmentPosition } from "./types";
import { round2 } from "./spending";

export type GoalProgress = {
  id: string;
  name: string;
  target: number;
  current: number;
  ratio: number;
  remaining: number;
  /** De onde veio o valor atual, para exibir abaixo da barra. */
  sourceLabel: string;
  available: boolean;
};

export function evaluateGoals(
  goals: GoalConfig[],
  ctx: {
    reserved: { name: string; amount: number }[] | null;
    positions: InvestmentPosition[] | null;
    currentBill: number | null;
  },
): GoalProgress[] {
  return goals.map((g) => {
    let current: number | null = null;
    let sourceLabel = "";

    switch (g.source.type) {
      case "reserved-balance": {
        const needle = g.source.nameContains.toLowerCase();
        const found = ctx.reserved?.filter((r) => r.name.toLowerCase().includes(needle)) ?? [];
        current = found.reduce((s, r) => s + r.amount, 0);
        sourceLabel = found.length
          ? `Saldo reservado "${found[0].name}" (Open Finance)`
          : `Nenhuma caixinha com "${g.source.nameContains}" no nome encontrada no Open Finance`;
        if (!ctx.reserved) current = null;
        break;
      }
      case "asset-class": {
        const cls = g.source.assetClass;
        if (ctx.positions) {
          const list = ctx.positions.filter((p) => p.assetClass === cls);
          current = list.reduce((s, p) => s + p.value, 0);
          sourceLabel = list.length ? list.map((p) => p.name).join(" + ").slice(0, 80) : "Nenhum investimento dessa classe no Open Finance";
        }
        break;
      }
      case "current-bill":
        current = ctx.currentBill;
        sourceLabel = "Parcial da fatura aberta";
        break;
    }

    const value = current ?? 0;
    return {
      id: g.id,
      name: g.name,
      target: g.target,
      current: round2(value),
      ratio: g.target > 0 ? value / g.target : 0,
      remaining: round2(Math.max(g.target - value, 0)),
      sourceLabel: current == null ? "Dados indisponíveis" : sourceLabel,
      available: current != null,
    };
  });
}

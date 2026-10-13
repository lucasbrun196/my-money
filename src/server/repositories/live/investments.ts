import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { InvestmentPosition, Sourced } from "@/domain/types";
import { CACHE_TAGS } from "@/server/cache-tags";
import { configured, env } from "@/server/env";
import { errorMessage } from "@/server/http";
import { pluggy } from "@/server/integrations/pluggy/client";
import { mapInvestment } from "@/server/integrations/pluggy/mappers";
import { getB3Quote } from "@/server/integrations/quotes";
import type { InvestmentsRepository } from "../types";

async function cachedPositions(itemId: string, fallbackInstitution: string): Promise<InvestmentPosition[]> {
  "use cache: remote";
  cacheTag(CACHE_TAGS.xp);
  cacheLife("bank");
  const raw = (await pluggy.getInvestments(itemId)).filter((i) => i.status !== "TOTAL_WITHDRAWAL" && i.balance > 0);
  const out: InvestmentPosition[] = [];
  for (const i of raw) {
    // Sem "valor investido" informado: calcula pelo histórico de compras/vendas.
    const history = i.amountOriginal == null ? await pluggy.getInvestmentTransactions(i.id).catch(() => []) : undefined;
    const p = mapInvestment(i, fallbackInstitution, history);
    if (p) out.push(p);
  }
  return out;
}

async function cachedQuote(ticker: string) {
  "use cache: remote";
  cacheTag(CACHE_TAGS.quotes);
  cacheLife("quotes");
  return getB3Quote(ticker);
}

/**
 * Ações vindas do Open Finance costumam ter preço do dia anterior: atualiza
 * pela cotação da brapi (em sequência — o plano grátis aceita 1 requisição
 * por vez). Sem token ou sem cotação, mantém o valor do Open Finance.
 */
async function refreshEquityPrices(positions: InvestmentPosition[]) {
  const notes: string[] = [];
  const out: InvestmentPosition[] = [];
  for (const p of positions) {
    if (!p.ticker || p.quantity == null) {
      out.push(p);
      continue;
    }
    try {
      const { price } = await cachedQuote(p.ticker);
      out.push({ ...p, currentPrice: price, value: price * p.quantity, priceSource: "brapi" });
    } catch (err) {
      notes.push(errorMessage(err));
      out.push(p);
    }
  }
  return { positions: out, notes };
}

export const liveInvestmentsRepository: InvestmentsRepository = {
  async getPositions(): Promise<Sourced<InvestmentPosition[]>> {
    const fetchedAt = new Date().toISOString();
    // A instituição vem do próprio investimento; o rótulo do item é só reserva.
    const items = [
      { id: env.pluggy.santanderItemId, label: "Santander" },
      { id: env.pluggy.xpItemId, label: "XP" },
    ].filter((i): i is { id: string; label: string } => Boolean(i.id));
    if (!configured.pluggy() || items.length === 0) {
      return {
        data: [],
        source: "unconfigured",
        fetchedAt,
        notes: ["Conecte a XP no Meu Pluggy e preencha PLUGGY_XP_ITEM_ID (veja docs/04-xp.md)."],
      };
    }

    const notes: string[] = [];
    const all: InvestmentPosition[] = [];
    for (const { id, label } of items) {
      try {
        all.push(...(await cachedPositions(id, label)));
      } catch (err) {
        notes.push(errorMessage(err));
      }
    }
    if (!configured.xp()) notes.push("XP ainda não conectada: conecte no Meu Pluggy e preencha PLUGGY_XP_ITEM_ID.");

    const { positions, notes: quoteNotes } = await refreshEquityPrices(all);
    if (positions.length === 0 && notes.length > 0 && all.length === 0) {
      return { data: [], source: "error", fetchedAt, notes };
    }
    return { data: positions, source: "live", fetchedAt, notes: [...notes, ...quoteNotes] };
  },
};

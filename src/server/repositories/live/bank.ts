import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { BankSnapshot, Sourced } from "@/domain/types";
import { addMonths, monthOf, todayISO } from "@/lib/dates";
import { CACHE_TAGS } from "@/server/cache-tags";
import { configured, env } from "@/server/env";
import { errorMessage } from "@/server/http";
import { pluggy } from "@/server/integrations/pluggy/client";
import {
  billingContext,
  indexCategories,
  mapBill,
  mapCard,
  mapChecking,
  mapTransaction,
} from "@/server/integrations/pluggy/mappers";
import type { BankRepository } from "../types";

const EMPTY: BankSnapshot = { connection: null, checking: null, card: null, bills: [], transactions: [] };

async function cachedCategories() {
  "use cache: remote";
  cacheTag(CACHE_TAGS.reference);
  cacheLife("reference");
  return pluggy.getCategories();
}

/**
 * Busca tudo do Santander numa tacada só e devolve já no formato de domínio
 * (compacto: o cache remoto da Vercel aceita itens de até 2 MB).
 * Erros são lançados de propósito: o Next não guarda em cache uma execução
 * que falhou, então a próxima visita tenta de novo.
 */
async function fetchSantander(itemId: string, dateFrom: string): Promise<{ snapshot: BankSnapshot; fetchedAt: string }> {
  "use cache: remote";
  cacheTag(CACHE_TAGS.bank);
  cacheLife("bank");

  const [item, accounts, categories] = await Promise.all([
    pluggy.getItem(itemId),
    pluggy.getAccounts(itemId),
    cachedCategories().catch(() => []),
  ]);

  const checkingRaw =
    accounts.find((a) => a.subtype === "CHECKING_ACCOUNT") ?? accounts.find((a) => a.type === "BANK") ?? null;
  const cardRaw = accounts.find((a) => a.type === "CREDIT") ?? null;

  const [checkingTx, cardTx, billsRaw] = await Promise.all([
    checkingRaw ? pluggy.getAllTransactions(checkingRaw.id, dateFrom) : Promise.resolve([]),
    cardRaw ? pluggy.getAllTransactions(cardRaw.id, dateFrom) : Promise.resolve([]),
    cardRaw ? pluggy.getBills(cardRaw.id).catch(() => []) : Promise.resolve([]),
  ]);

  const bills = billsRaw.map(mapBill).sort((a, b) => (a.dueDate < b.dueDate ? 1 : -1));
  const catIndex = indexCategories(categories);
  const billing = billingContext(bills, cardTx);

  const transactions = [
    ...checkingTx.map((t) => mapTransaction(t, "conta", catIndex, billing)),
    ...cardTx.map((t) => mapTransaction(t, "cartao", catIndex, billing)),
  ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return {
    snapshot: {
      connection: {
        institution: item.connector?.name ?? "Santander",
        status: item.status,
        lastSyncAt: item.lastUpdatedAt,
      },
      checking: checkingRaw ? mapChecking(checkingRaw) : null,
      card: cardRaw ? mapCard(cardRaw) : null,
      bills,
      transactions,
    },
    fetchedAt: new Date().toISOString(),
  };
}

export const liveBankRepository: BankRepository = {
  async getSnapshot(): Promise<Sourced<BankSnapshot>> {
    if (!configured.santander()) {
      return {
        data: EMPTY,
        source: "unconfigured",
        fetchedAt: new Date().toISOString(),
        notes: ["Configure PLUGGY_CLIENT_ID, PLUGGY_CLIENT_SECRET e PLUGGY_SANTANDER_ITEM_ID (veja docs/02-pluggy.md)."],
      };
    }
    // Desde o 1º dia do mês, 12 meses atrás: chave de cache estável durante o mês.
    const dateFrom = `${addMonths(monthOf(todayISO()), -12)}-01`;
    try {
      const { snapshot, fetchedAt } = await fetchSantander(env.pluggy.santanderItemId!, dateFrom);
      const notes: string[] = [];
      if (snapshot.connection && snapshot.connection.status !== "UPDATED") {
        notes.push(`Conexão Pluggy com status ${snapshot.connection.status} — confira no meu.pluggy.ai.`);
      }
      return { data: snapshot, source: "live", fetchedAt, notes };
    } catch (err) {
      return { data: EMPTY, source: "error", fetchedAt: new Date().toISOString(), notes: [errorMessage(err)] };
    }
  },
};

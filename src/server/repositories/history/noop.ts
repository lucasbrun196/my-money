import "server-only";
import type { HistoryRepository } from "../types";

/**
 * Histórico desligado (fase atual: sem banco de dados). Quando o Firebase
 * entrar, crie `history/firestore.ts` implementando a mesma interface e troque
 * na fábrica (../index.ts). Veja docs/06-firebase.md.
 */
export const noopHistoryRepository: HistoryRepository = {
  enabled: false,
  async saveDailySnapshot() {},
  async getSnapshots() {
    return [];
  },
  async archiveTransactions() {},
  async getArchivedTransactions() {
    return [];
  },
};

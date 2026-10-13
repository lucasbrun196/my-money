import "server-only";
import { env } from "@/server/env";
import { demoBankRepository, demoCryptoRepository, demoInvestmentsRepository } from "./demo";
import { noopHistoryRepository } from "./history/noop";
import { liveBankRepository } from "./live/bank";
import { liveCryptoRepository } from "./live/crypto";
import { liveInvestmentsRepository } from "./live/investments";
import type { Repositories } from "./types";

/**
 * Fábrica de repositórios — o ÚNICO lugar que sabe de onde vêm os dados.
 * Para ligar o Firebase: troque `history` por `firestoreHistoryRepository`.
 */
export function getRepositories(): Repositories {
  if (env.demoMode) {
    return {
      bank: demoBankRepository,
      crypto: demoCryptoRepository,
      investments: demoInvestmentsRepository,
      history: noopHistoryRepository,
    };
  }
  return {
    bank: liveBankRepository,
    crypto: liveCryptoRepository,
    investments: liveInvestmentsRepository,
    history: noopHistoryRepository,
  };
}

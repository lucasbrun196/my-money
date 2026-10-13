import "server-only";
import { buildCryptoSnapshot } from "@/domain/crypto";
import { todayISO } from "@/lib/dates";
import type { BankRepository, CryptoRepository, InvestmentsRepository } from "../types";
import { demoBankSnapshot, demoCrypto, demoPositions } from "./fixtures";

const note = ["Modo demonstração (DEMO_MODE=true): dados fictícios."];

export const demoBankRepository: BankRepository = {
  async getSnapshot() {
    return { data: demoBankSnapshot(todayISO()), source: "demo", fetchedAt: new Date().toISOString(), notes: note };
  },
};

export const demoCryptoRepository: CryptoRepository = {
  async getSnapshot() {
    const { balances, prices, basis } = demoCrypto();
    return {
      data: buildCryptoSnapshot(balances, prices, basis),
      source: "demo",
      fetchedAt: new Date().toISOString(),
      notes: note,
    };
  },
};

export const demoInvestmentsRepository: InvestmentsRepository = {
  async getPositions() {
    return { data: demoPositions(), source: "demo", fetchedAt: new Date().toISOString(), notes: note };
  },
};

import "server-only";
import { cache } from "react";
import { todayISO } from "@/lib/dates";
import { requireSession } from "@/server/auth/dal";
import { getRepositories } from "@/server/repositories";

/**
 * Pontos de entrada de dados para as páginas. Todos verificam a sessão
 * antes (DAL) e usam `cache` do React para que várias seções da mesma página
 * compartilhem uma única chamada por requisição.
 */

export const getToday = cache(async () => {
  await requireSession(); // lê cookies → a partir daqui a renderização é por requisição
  return todayISO();
});

export const getBankData = cache(async () => {
  await requireSession();
  return getRepositories().bank.getSnapshot();
});

export const getCryptoData = cache(async () => {
  await requireSession();
  return getRepositories().crypto.getSnapshot();
});

export const getInvestmentsData = cache(async () => {
  await requireSession();
  return getRepositories().investments.getPositions();
});

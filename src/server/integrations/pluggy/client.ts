import "server-only";
import { env } from "@/server/env";
import { fetchJson, UpstreamError } from "@/server/http";
import type {
  PluggyAccount,
  PluggyBill,
  PluggyCategory,
  PluggyCursorPage,
  PluggyInvestment,
  PluggyInvestmentTransaction,
  PluggyItem,
  PluggyPage,
  PluggyTransaction,
} from "./types";

/**
 * Cliente da API da Pluggy.
 *
 * Autenticação: POST /auth com clientId/clientSecret devolve uma API Key
 * válida por 2 horas, enviada depois no header X-API-KEY. Guardamos a key em
 * memória (por instância) e renovamos com folga de 10 minutos.
 */

let apiKeyCache: { key: string; expiresAt: number } | null = null;

async function getApiKey(): Promise<string> {
  if (apiKeyCache && apiKeyCache.expiresAt > Date.now()) return apiKeyCache.key;
  const { clientId, clientSecret, baseUrl } = env.pluggy;
  if (!clientId || !clientSecret) {
    throw new UpstreamError("Pluggy", "Pluggy: PLUGGY_CLIENT_ID/SECRET não configurados");
  }
  const { apiKey } = await fetchJson<{ apiKey: string }>("Pluggy", `${baseUrl}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
  });
  apiKeyCache = { key: apiKey, expiresAt: Date.now() + 110 * 60_000 };
  return apiKey;
}

async function get<T>(path: string, params: Record<string, string | undefined> = {}): Promise<T> {
  const query = new URLSearchParams(
    Object.entries(params).filter((e): e is [string, string] => e[1] !== undefined),
  ).toString();
  const url = `${env.pluggy.baseUrl}${path}${query ? `?${query}` : ""}`;

  const call = async () => fetchJson<T>("Pluggy", url, { headers: { "X-API-KEY": await getApiKey() } });
  try {
    return await call();
  } catch (err) {
    // Key expirada/revogada: descarta e tenta uma vez com uma nova.
    if (err instanceof UpstreamError && (err.status === 401 || err.status === 403)) {
      apiKeyCache = null;
      return call();
    }
    throw err;
  }
}

export const pluggy = {
  getItem: (itemId: string) => get<PluggyItem>(`/items/${itemId}`),

  getAccounts: async (itemId: string) => (await get<PluggyPage<PluggyAccount>>("/accounts", { itemId })).results,

  /** GET /v2/transactions com paginação por cursor (o /transactions antigo foi descontinuado). */
  getAllTransactions: async (accountId: string, dateFrom: string): Promise<PluggyTransaction[]> => {
    const all: PluggyTransaction[] = [];
    let page = await get<PluggyCursorPage<PluggyTransaction>>("/v2/transactions", { accountId, dateFrom });
    all.push(...page.results);
    for (let guard = 0; page.next && guard < 50; guard++) {
      // `next` vem como query string pronta ("?accountId=...&after=...").
      const after = new URLSearchParams(page.next.replace(/^[^?]*\?/, "")).get("after");
      if (!after) break;
      page = await get<PluggyCursorPage<PluggyTransaction>>("/v2/transactions", { accountId, dateFrom, after });
      all.push(...page.results);
    }
    return all;
  },

  getBills: async (accountId: string) =>
    (await get<PluggyPage<PluggyBill>>("/bills", { accountId, pageSize: "50" })).results,

  getCategories: async () => (await get<PluggyPage<PluggyCategory>>("/categories")).results,

  getInvestments: async (itemId: string) =>
    (await get<PluggyPage<PluggyInvestment>>("/investments", { itemId, pageSize: "200" })).results,

  /** Movimentações (compras/vendas) de um investimento, para calcular o preço médio. */
  getInvestmentTransactions: async (investmentId: string): Promise<PluggyInvestmentTransaction[]> => {
    const all: PluggyInvestmentTransaction[] = [];
    for (let page = 1; page <= 20; page++) {
      const res = await get<PluggyPage<PluggyInvestmentTransaction>>(`/investments/${investmentId}/transactions`, {
        page: String(page),
        pageSize: "500",
      });
      all.push(...res.results);
      if (page >= res.totalPages) break;
    }
    return all;
  },
};

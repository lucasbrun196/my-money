import "server-only";
import { env } from "@/server/env";
import { fetchJson, UpstreamError } from "@/server/http";

/**
 * brapi.dev — cotações da B3. Plano gratuito: 15 mil requisições/mês,
 * 1 ativo por requisição, atualização a cada 30 min. O token vai no header
 * (não na URL) para não aparecer em logs.
 */
export async function getB3Quote(ticker: string): Promise<{ price: number; time: string | null }> {
  const headers: HeadersInit = env.brapi.token ? { Authorization: `Bearer ${env.brapi.token}` } : {};
  const data = await fetchJson<{ results?: { regularMarketPrice?: number; regularMarketTime?: string }[] }>(
    "brapi",
    `https://brapi.dev/api/quote/${encodeURIComponent(ticker)}`,
    { headers, timeoutMs: 10_000 },
  );
  const r = data.results?.[0];
  if (!r?.regularMarketPrice) throw new UpstreamError("brapi", `brapi: sem cotação para ${ticker}`);
  return { price: r.regularMarketPrice, time: r.regularMarketTime ?? null };
}

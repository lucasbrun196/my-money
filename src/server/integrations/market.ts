import "server-only";
import { env } from "@/server/env";
import { fetchJson, UpstreamError } from "@/server/http";

/**
 * Dados de mercado gratuitos para o painel de indicadores:
 *  - brapi.dev: ações e Ibovespa (plano grátis: histórico de até 3 meses);
 *  - AwesomeAPI: câmbio (dólar, euro, peso argentino...) sem chave, até 360 dias;
 *  - Banco Central (SGS): Selic, CDI, IPCA;
 *  - Binance (dados públicos): candles diários de cripto;
 *  - Yahoo Finance (não oficial): proventos, para o dividend yield.
 */

const day = (unixMs: number) => new Date(unixMs).toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// brapi.dev
// ---------------------------------------------------------------------------

export type StockQuote = {
  symbol: string;
  name: string;
  price: number;
  change: number | null;
  changePct: number | null;
  open: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  previousClose: number | null;
  volume: number | null;
  marketCap: number | null;
  week52Low: number | null;
  week52High: number | null;
  priceEarnings: number | null;
  earningsPerShare: number | null;
  time: string;
  history: { date: string; value: number }[];
};

type BrapiQuote = {
  symbol: string;
  longName?: string;
  shortName?: string;
  regularMarketPrice: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketOpen?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketPreviousClose?: number;
  regularMarketVolume?: number;
  marketCap?: number | null;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekHigh?: number;
  priceEarnings?: number | null;
  earningsPerShare?: number | null;
  regularMarketTime?: string;
  historicalDataPrice?: { date: number; close: number | null }[];
};

/** Cotação + histórico diário de 3 meses (máximo do plano gratuito). */
export async function getStockQuote(symbol: string): Promise<StockQuote> {
  const headers: HeadersInit = env.brapi.token ? { Authorization: `Bearer ${env.brapi.token}` } : {};
  const data = await fetchJson<{ results?: BrapiQuote[] }>(
    "brapi",
    `https://brapi.dev/api/quote/${encodeURIComponent(symbol)}?range=3mo&interval=1d`,
    { headers, timeoutMs: 12_000 },
  );
  const q = data.results?.[0];
  if (!q) throw new UpstreamError("brapi", `brapi: sem dados para ${symbol}`);
  return {
    symbol: q.symbol,
    name: q.longName ?? q.shortName ?? q.symbol,
    price: q.regularMarketPrice,
    change: q.regularMarketChange ?? null,
    changePct: q.regularMarketChangePercent != null ? q.regularMarketChangePercent / 100 : null,
    open: q.regularMarketOpen ?? null,
    dayHigh: q.regularMarketDayHigh ?? null,
    dayLow: q.regularMarketDayLow ?? null,
    previousClose: q.regularMarketPreviousClose ?? null,
    volume: q.regularMarketVolume ?? null,
    marketCap: q.marketCap ?? null,
    week52Low: q.fiftyTwoWeekLow ?? null,
    week52High: q.fiftyTwoWeekHigh ?? null,
    priceEarnings: q.priceEarnings ?? null,
    earningsPerShare: q.earningsPerShare ?? null,
    time: q.regularMarketTime ?? new Date().toISOString(),
    history: (q.historicalDataPrice ?? [])
      .filter((h) => h.close != null)
      .map((h) => ({ date: day(h.date * 1000), value: h.close as number }))
      .sort((a, b) => (a.date < b.date ? -1 : 1)),
  };
}

// ---------------------------------------------------------------------------
// AwesomeAPI (câmbio)
// ---------------------------------------------------------------------------

export type FxQuote = {
  pair: string;
  name: string;
  bid: number;
  ask: number;
  high: number;
  low: number;
  changeAbs: number;
  changePct: number;
  time: string;
  history: { date: string; value: number }[];
};

type AwesomeDaily = { name?: string; bid: string; ask: string; high: string; low: string; varBid: string; pctChange: string; timestamp: string };

/** Cotação atual + 360 dias de histórico diário. Ex.: pair = "USD-BRL". */
export async function getFxQuote(pair: string): Promise<FxQuote> {
  const rows = await fetchJson<AwesomeDaily[]>("AwesomeAPI", `https://economia.awesomeapi.com.br/json/daily/${pair}/360`, {
    timeoutMs: 12_000,
  });
  const latest = rows[0];
  if (!latest) throw new UpstreamError("AwesomeAPI", `AwesomeAPI: sem dados para ${pair}`);
  const byDay = new Map<string, number>();
  for (const r of rows) {
    const d = day(Number(r.timestamp) * 1000);
    if (!byDay.has(d)) byDay.set(d, Number(r.bid)); // a lista vem do mais recente para o mais antigo
  }
  return {
    pair,
    name: latest.name ?? pair,
    bid: Number(latest.bid),
    ask: Number(latest.ask),
    high: Number(latest.high),
    low: Number(latest.low),
    changeAbs: Number(latest.varBid),
    changePct: Number(latest.pctChange) / 100,
    time: new Date(Number(latest.timestamp) * 1000).toISOString(),
    history: [...byDay.entries()].map(([date, value]) => ({ date, value })).sort((a, b) => (a.date < b.date ? -1 : 1)),
  };
}

// ---------------------------------------------------------------------------
// Banco Central — SGS
// ---------------------------------------------------------------------------

/** Série temporal do SGS (valores em %). `from` e `to` no formato AAAA-MM-DD. */
export async function getBcbSeries(code: number, from: string, to: string): Promise<{ date: string; value: number }[]> {
  const br = (iso: string) => iso.split("-").reverse().join("/");
  const rows = await fetchJson<{ data: string; valor: string }[]>(
    "Banco Central",
    `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados?formato=json&dataInicial=${br(from)}&dataFinal=${br(to)}`,
    { timeoutMs: 12_000 },
  );
  return rows
    .map((r) => ({ date: r.data.split("/").reverse().join("-"), value: Number(r.valor) }))
    .filter((r) => r.date <= to && Number.isFinite(r.value));
}

// ---------------------------------------------------------------------------
// Binance (público)
// ---------------------------------------------------------------------------

type Kline = [number, string, string, string, string, string];

/** Candles diários do último ano (fechamento) de um par, ex.: BTCBRL. */
export async function getCryptoDaily(symbol: string): Promise<{ date: string; value: number; high: number; low: number; volume: number }[]> {
  let lastError: unknown;
  for (const base of [env.binance.baseUrl, "https://data-api.binance.vision"]) {
    try {
      const rows = await fetchJson<Kline[]>("Binance", `${base}/api/v3/klines?symbol=${symbol}&interval=1d&limit=365`, {
        timeoutMs: 10_000,
      });
      return rows.map((k) => ({ date: day(k[0]), value: Number(k[4]), high: Number(k[2]), low: Number(k[3]), volume: Number(k[5]) }));
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// Yahoo Finance (não oficial, sem chave) — só para proventos
// ---------------------------------------------------------------------------

/**
 * Proventos pagos por ação nos últimos 2 anos (dividendos/JCP, como o Yahoo
 * informa). O plano grátis da brapi não libera dividendos; o Yahoo é usado
 * só para isso. Endpoint não documentado: pode mudar sem aviso.
 */
export async function getDividends(symbol: string): Promise<{ date: string; amount: number }[]> {
  const data = await fetchJson<{
    chart?: { result?: { events?: { dividends?: Record<string, { date: number; amount: number }> } }[] };
  }>("Yahoo Finance", `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}.SA?range=2y&interval=1mo&events=div`, {
    headers: { "User-Agent": "Mozilla/5.0 (MyMoney)" },
    timeoutMs: 10_000,
  });
  const divs = data.chart?.result?.[0]?.events?.dividends ?? {};
  return Object.values(divs)
    .map((d) => ({ date: day(d.date * 1000), amount: d.amount }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

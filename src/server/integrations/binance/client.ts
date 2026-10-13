import "server-only";
import { createHmac } from "node:crypto";
import type { CostEvent, CryptoBalance } from "@/domain/crypto";
import { env } from "@/server/env";
import { fetchJson, UpstreamError } from "@/server/http";

/**
 * Cliente mínimo da API da Binance (somente leitura).
 *
 * Endpoints assinados (USER_DATA) exigem:
 *  - header X-MBX-APIKEY com a API Key;
 *  - parâmetros `timestamp` (ms) e `recvWindow`;
 *  - `signature` = HMAC-SHA256(query string, API Secret) em hexadecimal.
 */

/** Domínio alternativo da Binance só para dados públicos de mercado. */
const PUBLIC_MARKET_BASES = [env.binance.baseUrl, "https://data-api.binance.vision"];

/** Stablecoins e moedas fiduciárias: não são "investimento" em cripto. */
export const NON_CRYPTO_ASSETS = new Set(["USDT", "USDC", "FDUSD", "BUSD", "TUSD", "DAI", "BRL", "USD", "EUR"]);

let serverTimeOffsetMs = 0;

function sign(queryString: string, secret: string): string {
  return createHmac("sha256", secret).update(queryString).digest("hex");
}

async function syncServerTime(): Promise<void> {
  const { serverTime } = await fetchJson<{ serverTime: number }>("Binance", `${env.binance.baseUrl}/api/v3/time`);
  serverTimeOffsetMs = serverTime - Date.now();
}

async function signedGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const { apiKey, apiSecret, baseUrl } = env.binance;
  if (!apiKey || !apiSecret) throw new UpstreamError("Binance", "Binance: BINANCE_API_KEY/SECRET não configuradas");

  const attempt = () => {
    const query = new URLSearchParams({
      ...params,
      recvWindow: "10000",
      timestamp: String(Date.now() + serverTimeOffsetMs),
    }).toString();
    const url = `${baseUrl}${path}?${query}&signature=${sign(query, apiSecret)}`;
    return fetchJson<T>("Binance", url, { headers: { "X-MBX-APIKEY": apiKey } });
  };

  try {
    return await attempt();
  } catch (err) {
    // -1021: relógio fora da janela recvWindow → sincroniza com o servidor e tenta de novo.
    if (err instanceof UpstreamError && err.code === -1021) {
      await syncServerTime();
      return attempt();
    }
    if (err instanceof UpstreamError && err.status === 451) {
      throw new UpstreamError(
        "Binance",
        "Binance bloqueou a região do servidor (HTTP 451). Na Vercel, use a região gru1 (São Paulo).",
        451,
      );
    }
    throw err;
  }
}

type AccountResponse = { balances: { asset: string; free: string; locked: string }[] };
type FlexibleResponse = { rows: { asset: string; totalAmount: string }[]; total: number };
type LockedResponse = { rows: { asset: string; amount: string }[]; total: number };

/**
 * Todos os saldos da conta: Spot (free + locked) + Simple Earn (flexível + travado).
 * Obs.: a carteira Spot lista o Earn flexível como "LDBTC", "LDSOL"... Esses
 * tickers são ignorados para não contar o mesmo ativo duas vezes.
 */
export async function getAllBalances(): Promise<CryptoBalance[]> {
  const [account, flexible, locked] = await Promise.all([
    signedGet<AccountResponse>("/api/v3/account", { omitZeroBalances: "true" }),
    signedGet<FlexibleResponse>("/sapi/v1/simple-earn/flexible/position", { size: "100" }),
    signedGet<LockedResponse>("/sapi/v1/simple-earn/locked/position", { size: "100" }).catch(
      () => ({ rows: [], total: 0 }) as LockedResponse,
    ),
  ]);

  const earnMirrors = new Set(flexible.rows.map((r) => `LD${r.asset}`));
  const map = new Map<string, CryptoBalance>();
  const get = (asset: string) => map.get(asset) ?? { asset, spot: 0, earn: 0 };
  for (const b of account.balances) {
    if (earnMirrors.has(b.asset)) continue;
    const cur = get(b.asset);
    map.set(b.asset, { ...cur, spot: cur.spot + Number(b.free) + Number(b.locked) });
  }
  for (const r of flexible.rows) {
    const cur = get(r.asset);
    map.set(r.asset, { ...cur, earn: cur.earn + Number(r.totalAmount) });
  }
  for (const r of locked.rows) {
    const cur = get(r.asset);
    map.set(r.asset, { ...cur, earn: cur.earn + Number(r.amount) });
  }
  return [...map.values()].filter((b) => b.spot + b.earn > 0);
}

// ---------------------------------------------------------------------------
// Histórico de compras → preço médio
// ---------------------------------------------------------------------------

const USD_STABLES = new Set(["USDT", "USDC", "FDUSD", "BUSD", "TUSD", "DAI"]);
const DAY = 86_400_000;

type Kline = [number, string, string, string, string];

/** USDT/BRL diário (fechamento) para converter compras em reais para dólares. */
async function usdBrlHistory(since: number): Promise<(time: number) => number> {
  const rows: Kline[] = [];
  let start = since;
  for (let i = 0; i < 5 && start < Date.now(); i++) {
    const page = await fetchJson<Kline[]>(
      "Binance",
      `${PUBLIC_MARKET_BASES[0]}/api/v3/klines?symbol=USDTBRL&interval=1d&startTime=${start}&limit=1000`,
    );
    if (page.length === 0) break;
    rows.push(...page);
    start = page[page.length - 1][0] + DAY;
  }
  const byDay = new Map(rows.map((r) => [Math.floor(r[0] / DAY), Number(r[4])]));
  const latest = rows.length ? Number(rows[rows.length - 1][4]) : 0;
  return (time) => {
    for (let d = Math.floor(time / DAY), k = 0; k < 7; k++, d--) {
      const v = byDay.get(d);
      if (v) return v;
    }
    return latest;
  };
}

type MyTrade = {
  id: number;
  time: number;
  price: string;
  qty: string;
  commission: string;
  commissionAsset: string;
  isBuyer: boolean;
};
type FiatPayment = {
  cryptoCurrency: string;
  obtainAmount: string;
  sourceAmount: string;
  fiatCurrency: string;
  status: string;
  createTime: number;
};
type ConvertTrade = {
  fromAsset: string;
  fromAmount: string;
  toAsset: string;
  toAmount: string;
  orderStatus: string;
  createTime: number;
};

/**
 * Eventos de compra/venda de cada ativo, em US$, a partir de:
 *  - trades Spot (pares com USDT/USDC/FDUSD/BRL);
 *  - compras com PIX/cartão (/sapi/v1/fiat/payments);
 *  - Binance Convert (/sapi/v1/convert/tradeFlow, janelas de 30 dias).
 * Rendimentos do Earn e depósitos vindos de fora não têm custo e ficam de fora
 * (o card mostra quanto da quantidade tem custo conhecido).
 */
export async function getCostEvents(assets: string[], lookbackDays = 730): Promise<CostEvent[]> {
  const since = Date.now() - lookbackDays * DAY;
  const brlPerUsdAt = await usdBrlHistory(since);
  const priceInUsd = (quote: string, price: number, time: number) =>
    USD_STABLES.has(quote) ? price : quote === "BRL" ? price / brlPerUsdAt(time) : null;
  const events: CostEvent[] = [];
  const tracked = new Set(assets);

  // 1) Trades Spot
  for (const asset of assets) {
    for (const quote of ["USDT", "FDUSD", "USDC", "BRL"]) {
      let fromId = "0";
      for (let page = 0; page < 20; page++) {
        let trades: MyTrade[];
        try {
          trades = await signedGet<MyTrade[]>("/api/v3/myTrades", { symbol: `${asset}${quote}`, fromId, limit: "1000" });
        } catch (err) {
          if (err instanceof UpstreamError && (err.code === -1121 || err.status === 400)) break; // par não existe
          throw err;
        }
        for (const t of trades) {
          const priceUsd = priceInUsd(quote, Number(t.price), t.time);
          if (priceUsd == null) continue;
          const fee = t.commissionAsset === asset ? Number(t.commission) : 0;
          events.push({
            asset,
            time: t.time,
            qty: Number(t.qty) - (t.isBuyer ? fee : 0),
            priceUsd,
            side: t.isBuyer ? "buy" : "sell",
          });
        }
        if (trades.length < 1000) break;
        fromId = String(trades[trades.length - 1].id + 1);
      }
    }
  }

  // 2) Compras com moeda fiduciária (PIX, cartão)
  for (let start = since; start < Date.now(); start += 90 * DAY) {
    const res = await signedGet<{ data?: FiatPayment[] }>("/sapi/v1/fiat/payments", {
      transactionType: "0",
      beginTime: String(start),
      endTime: String(Math.min(start + 90 * DAY, Date.now())),
      rows: "500",
    }).catch(() => ({ data: [] as FiatPayment[] }));
    for (const p of res.data ?? []) {
      if (!tracked.has(p.cryptoCurrency) || !/complet|success/i.test(p.status)) continue;
      const qty = Number(p.obtainAmount);
      const priceUsd = qty > 0 ? priceInUsd(p.fiatCurrency, Number(p.sourceAmount) / qty, p.createTime) : null;
      if (priceUsd != null) events.push({ asset: p.cryptoCurrency, time: p.createTime, qty, priceUsd, side: "buy" });
    }
  }

  // 3) Convert
  for (let start = since; start < Date.now(); start += 30 * DAY) {
    const res = await signedGet<{ list?: ConvertTrade[] }>("/sapi/v1/convert/tradeFlow", {
      startTime: String(start),
      endTime: String(Math.min(start + 30 * DAY - 1, Date.now())),
      limit: "1000",
    }).catch(() => ({ list: [] as ConvertTrade[] }));
    for (const c of res.list ?? []) {
      if (!/SUCCESS/i.test(c.orderStatus)) continue;
      if (tracked.has(c.toAsset)) {
        const qty = Number(c.toAmount);
        const priceUsd = qty > 0 ? priceInUsd(c.fromAsset, Number(c.fromAmount) / qty, c.createTime) : null;
        if (priceUsd != null) events.push({ asset: c.toAsset, time: c.createTime, qty, priceUsd, side: "buy" });
      }
      if (tracked.has(c.fromAsset)) {
        events.push({ asset: c.fromAsset, time: c.createTime, qty: Number(c.fromAmount), priceUsd: 0, side: "sell" });
      }
    }
  }

  return events;
}

type TickerPrice = { symbol: string; price: string };

/** Preços públicos (não precisam de API Key). Tenta api.binance.com e depois data-api.binance.vision. */
export async function getTickerPrices(symbols: string[]): Promise<Record<string, number>> {
  let lastError: unknown;
  for (const base of PUBLIC_MARKET_BASES) {
    try {
      const url = `${base}/api/v3/ticker/price?symbols=${encodeURIComponent(JSON.stringify(symbols))}`;
      const list = await fetchJson<TickerPrice[]>("Binance", url, { timeoutMs: 8000 }).catch(async (err) => {
        // -1121 = algum símbolo não existe: busca a lista completa e filtra.
        if (err instanceof UpstreamError && err.code === -1121) {
          return fetchJson<TickerPrice[]>("Binance", `${base}/api/v3/ticker/price`, { timeoutMs: 8000 });
        }
        throw err;
      });
      return Object.fromEntries(list.filter((t) => symbols.includes(t.symbol)).map((t) => [t.symbol, Number(t.price)]));
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";
import type { Indicator } from "@/domain/indicators";
import { formatIndicator } from "@/domain/indicators";
import { addMonths, clampedDate, monthOf, parts } from "@/lib/dates";
import { brl, dateBR, quantity } from "@/lib/format";
import { CACHE_TAGS } from "@/server/cache-tags";
import { errorMessage } from "@/server/http";
import { getBcbSeries, getCryptoDaily, getDividends, getFxQuote, getStockQuote } from "@/server/integrations/market";
import { getCryptoData, getInvestmentsData, getToday } from "./data";

// --- cache por fonte -------------------------------------------------------

async function cachedStock(symbol: string) {
  "use cache: remote";
  cacheTag(CACHE_TAGS.quotes);
  cacheLife("quotes");
  return getStockQuote(symbol);
}

async function cachedFx(pair: string) {
  "use cache: remote";
  cacheTag(CACHE_TAGS.prices);
  cacheLife("market");
  return getFxQuote(pair);
}

async function cachedBcb(code: number, from: string, to: string) {
  "use cache: remote";
  cacheTag(CACHE_TAGS.reference);
  cacheLife("reference");
  return getBcbSeries(code, from, to);
}

async function cachedDividends(symbol: string) {
  "use cache: remote";
  cacheTag(CACHE_TAGS.reference);
  cacheLife("reference");
  return getDividends(symbol);
}

async function cachedCrypto(symbol: string) {
  "use cache: remote";
  cacheTag(CACHE_TAGS.prices);
  cacheLife("market");
  return getCryptoDaily(symbol);
}

// --- helpers de formatação -------------------------------------------------

const compact = (v: number) =>
  new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(v);
const num = (v: number, digits = 2) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);

type Stat = { label: string; value: string };
const stat = (label: string, value: string | null | undefined): Stat[] => (value ? [{ label, value }] : []);

const FX_PAIRS = [
  { pair: "USD-BRL", label: "Dólar", subtitle: "Dólar americano / Real" },
  { pair: "EUR-BRL", label: "Euro", subtitle: "Euro / Real" },
  { pair: "ARS-BRL", label: "Peso argentino", subtitle: "Peso argentino / Real" },
  { pair: "GBP-BRL", label: "Libra", subtitle: "Libra esterlina / Real" },
];

/** Valor que vigorava na data mais próxima de `daysAgo` dias atrás. */
function valueDaysAgo(series: { date: string; value: number }[], date: string): number | null {
  const before = series.filter((p) => p.date <= date);
  return before.length ? before[before.length - 1].value : null;
}

export type IndicatorsView = { indicators: Indicator[]; notes: string[] };

/**
 * Monta o painel de indicadores: suas ações (das posições do Open Finance),
 * Ibovespa, juros/inflação (Banco Central), câmbio (AwesomeAPI) e suas
 * criptos (Binance). Cada indicador é independente: se uma fonte falhar,
 * só ele some e o motivo vai para `notes`.
 */
export const getIndicatorsView = cache(async (): Promise<IndicatorsView> => {
  const today = await getToday();
  // Início do mês, 13 meses atrás: chave de cache estável durante o mês.
  const from = `${addMonths(monthOf(today), -13)}-01`;
  const { y, m, d } = parts(today);
  const yearAgo = clampedDate(y - 1, m, d);
  const [positions, crypto] = await Promise.all([getInvestmentsData(), getCryptoData()]);

  const indicators: Indicator[] = [];
  const notes: string[] = [];
  const fail = (what: string, err: unknown) => notes.push(`${what}: ${errorMessage(err)}`);

  // 1) Ações da carteira + Ibovespa (brapi: 1 requisição por vez no plano grátis)
  const stocks = positions.data.filter((p) => p.ticker && p.assetClass === "acoes");
  const tickers = [...new Set(stocks.map((p) => p.ticker!))];
  for (const symbol of [...tickers, "^BVSP"]) {
    try {
      const q = await cachedStock(symbol);
      const isIndex = symbol.startsWith("^");
      // Dividend yield 12m = proventos por ação nos últimos 12 meses ÷ preço atual.
      let dividendStats: Stat[] = [];
      if (!isIndex) {
        try {
          const divs = (await cachedDividends(symbol)).filter((x) => x.date > yearAgo && x.date <= today);
          const perShare = divs.reduce((s, x) => s + x.amount, 0);
          const lastDiv = divs[divs.length - 1];
          const qty = stocks.find((p) => p.ticker === symbol)?.quantity;
          dividendStats = [
            ...stat("Dividend yield (12m)", q.price > 0 ? `${num((perShare / q.price) * 100)}%` : null),
            ...stat("Proventos por ação (12m)", brl(perShare)),
            ...stat("Último provento", lastDiv ? `${brl(lastDiv.amount)} em ${dateBR(lastDiv.date)}` : "nenhum em 12 meses"),
            ...stat("Seus proventos (12m, estimado)", qty ? brl(perShare * qty) : null),
          ];
        } catch (err) {
          fail(`Dividendos de ${symbol}`, err);
        }
      }
      const pos = stocks.find((p) => p.ticker === symbol);
      const unit = isIndex ? "points" : "brl";
      const f = (v: number | null) => (v != null ? formatIndicator(v, unit) : null);
      indicators.push({
        id: `stock:${symbol}`,
        group: isIndex ? "Índices" : "Minhas ações",
        label: isIndex ? "Ibovespa" : symbol,
        subtitle: isIndex ? "Índice da B3" : q.name,
        unit,
        value: q.price,
        changeAbs: q.change,
        changePct: q.changePct,
        asOf: q.time,
        history: q.history,
        historyNote: isIndex
          ? "Histórico de até 3 meses (limite do plano grátis da brapi)."
          : "Histórico de até 3 meses (limite do plano grátis da brapi). Proventos: Yahoo Finance (valores por ação, podem incluir JCP).",
        stats: [
          ...stat("Abertura", f(q.open)),
          ...stat("Fechamento anterior", f(q.previousClose)),
          ...stat("Máxima do dia", f(q.dayHigh)),
          ...stat("Mínima do dia", f(q.dayLow)),
          ...stat("Mínima 52 semanas", f(q.week52Low)),
          ...stat("Máxima 52 semanas", f(q.week52High)),
          ...stat("P/L", q.priceEarnings != null ? num(q.priceEarnings) : null),
          ...stat("LPA", q.earningsPerShare != null ? brl(q.earningsPerShare) : null),
          ...dividendStats,
          ...stat("Valor de mercado", q.marketCap ? `R$ ${compact(q.marketCap)}` : null),
          ...stat("Volume", q.volume ? compact(q.volume) : null),
          ...stat("Sua posição", pos?.quantity != null ? `${quantity(pos.quantity, 2)} · ${brl(pos.value)}` : null),
          ...stat("Seu preço médio", pos?.invested != null && pos.quantity ? brl(pos.invested / pos.quantity) : null),
        ],
        source: isIndex ? "brapi.dev" : "brapi.dev (cotação) · Yahoo Finance (proventos)",
      });
    } catch (err) {
      fail(symbol === "^BVSP" ? "Ibovespa" : symbol, err);
    }
  }

  // 2) Juros e inflação (Banco Central)
  const [selic, cdi, ipca12, ipcaMonth] = await Promise.allSettled([
    cachedBcb(432, from, today),
    cachedBcb(4389, from, today),
    cachedBcb(13522, from, today),
    cachedBcb(433, from, today),
  ]);
  const rate = (
    res: PromiseSettledResult<{ date: string; value: number }[]>,
    id: string,
    label: string,
    subtitle: string,
    extra: (s: { date: string; value: number }[]) => Stat[],
  ) => {
    if (res.status === "rejected") return fail(label, res.reason);
    const s = res.value;
    if (!s.length) return;
    const last = s[s.length - 1];
    const prev = s.length > 1 ? s[s.length - 2] : null;
    const ago = valueDaysAgo(s, yearAgo);
    indicators.push({
      id,
      group: "Juros e inflação",
      label,
      subtitle,
      unit: "pct",
      value: last.value,
      changeAbs: prev ? last.value - prev.value : null,
      changePct: null,
      asOf: last.date,
      history: s,
      stats: [
        ...stat("Data de referência", dateBR(last.date)),
        ...stat("Há 12 meses", ago != null ? formatIndicator(ago, "pct") : null),
        ...stat("Variação em 12 meses", ago != null ? `${last.value - ago >= 0 ? "+" : "−"}${num(Math.abs(last.value - ago))} p.p.` : null),
        ...extra(s),
      ],
      source: "Banco Central (SGS)",
    });
  };
  rate(selic, "rate:selic", "Selic", "Meta da taxa Selic (Copom), % ao ano", (s) => {
    const last = s[s.length - 1].value;
    const since = [...s].reverse().find((p) => p.value !== last);
    const start = since ? s[s.findIndex((p) => p === since) + 1] : s[0];
    return stat("Vigente desde", start ? dateBR(start.date) : null);
  });
  rate(cdi, "rate:cdi", "CDI", "Taxa DI anualizada, % ao ano", () => []);
  rate(ipca12, "rate:ipca", "IPCA (12 meses)", "Inflação oficial acumulada em 12 meses", () => {
    if (ipcaMonth.status !== "fulfilled" || !ipcaMonth.value.length) return [];
    const m = ipcaMonth.value[ipcaMonth.value.length - 1];
    return stat(`IPCA do mês (${m.date.slice(5, 7)}/${m.date.slice(0, 4)})`, formatIndicator(m.value, "pct"));
  });

  // 3) Câmbio (AwesomeAPI)
  const fx = await Promise.allSettled(FX_PAIRS.map((p) => cachedFx(p.pair)));
  fx.forEach((res, i) => {
    const meta = FX_PAIRS[i];
    if (res.status === "rejected") return fail(meta.label, res.reason);
    const q = res.value;
    indicators.push({
      id: `fx:${meta.pair}`,
      group: "Moedas",
      label: meta.label,
      subtitle: meta.subtitle,
      unit: "fx",
      value: q.bid,
      changeAbs: q.changeAbs,
      changePct: q.changePct,
      asOf: q.time,
      history: q.history,
      stats: [
        ...stat("Compra", formatIndicator(q.bid, "fx")),
        ...stat("Venda", formatIndicator(q.ask, "fx")),
        ...stat("Máxima do dia", formatIndicator(q.high, "fx")),
        ...stat("Mínima do dia", formatIndicator(q.low, "fx")),
        ...stat("R$ 100 compram", `${num(100 / q.ask, q.ask < 0.1 ? 0 : 2)} ${meta.pair.slice(0, 3)}`),
      ],
      source: "AwesomeAPI",
    });
  });

  // 4) Suas criptos (Binance, dados públicos)
  for (const h of crypto.data.holdings) {
    try {
      const candles = await cachedCrypto(`${h.asset}BRL`);
      const last = candles[candles.length - 1];
      const prev = candles[candles.length - 2];
      indicators.push({
        id: `crypto:${h.asset}`,
        group: "Cripto",
        label: h.asset,
        subtitle: `${h.asset} / Real`,
        unit: "brl",
        value: last.value,
        changeAbs: prev ? last.value - prev.value : null,
        changePct: prev ? (last.value - prev.value) / prev.value : null,
        asOf: new Date().toISOString(),
        history: candles.map((c) => ({ date: c.date, value: c.value })),
        stats: [
          ...stat("Máxima do dia", brl(last.high)),
          ...stat("Mínima do dia", brl(last.low)),
          ...stat("Volume do dia", `${compact(last.volume)} ${h.asset}`),
          ...stat("Sua posição", `${quantity(h.quantity)} · ${brl(h.valueBrl)}`),
        ],
        source: "Binance",
      });
    } catch (err) {
      fail(h.asset, err);
    }
  }

  return { indicators, notes };
});

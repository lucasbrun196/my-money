import { AllocationBar } from "@/components/charts/allocation-bar";
import { AnimatedBRL } from "@/components/ui/animated-number";
import { Card } from "@/components/ui/card";
import { Delta } from "@/components/ui/delta";
import { Money } from "@/components/ui/money";
import { SourceBadge, SourceNotes, Unavailable } from "@/components/ui/source-badge";
import type { CryptoHolding } from "@/domain/types";
import { SERIES } from "@/lib/colors";
import { cn } from "@/lib/cn";
import { brl, pctShort, quantity, signedBrl, signedUsd, usd } from "@/lib/format";
import { getCryptoData } from "@/server/services/data";
import { Insight } from "../shared";

const ASSET_STYLE: Record<string, { name: string; color: string }> = {
  BTC: { name: "Bitcoin", color: "#c98500" },
  SOL: { name: "Solana", color: "#9085e9" },
};

/** Cor fixa por ativo: conhecida, ou derivada do ticker (estável entre visitas). */
function styleOf(asset: string) {
  if (ASSET_STYLE[asset]) return ASSET_STYLE[asset];
  const hash = [...asset].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return { name: asset, color: SERIES[hash % SERIES.length] };
}

export async function CryptoSection() {
  const sourced = await getCryptoData();
  const snap = sourced.data;

  if (snap.holdings.length === 0) {
    return (
      <Card title="Binance">
        <Unavailable sourced={sourced} what="a Binance" />
      </Card>
    );
  }

  // Resultado total só com os ativos que têm preço médio conhecido.
  const withCost = snap.holdings.filter((h) => h.avgPriceUsd != null && h.pnlUsd != null);
  const costUsd = withCost.reduce((s, h) => s + h.quantity * (h.avgPriceUsd ?? 0), 0);
  const pnlUsd = withCost.reduce((s, h) => s + (h.pnlUsd ?? 0), 0);
  const holdings = [...snap.holdings].sort((a, b) => b.valueBrl - a.valueBrl);

  return (
    <div className="stagger grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3">
      <Card title="Carteira Binance" action={<SourceBadge sourced={sourced} />} className="lg:col-span-3">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">Valor total</p>
            <AnimatedBRL value={snap.totalBrl} className="mt-1.5 text-[40px] font-semibold tracking-[-0.03em] sm:text-5xl" />
            <p className="money mt-1 font-mono text-xs text-ink-3">{usd(snap.totalUsd)}</p>
          </div>
          <div className="sm:text-right">
            <p className="eyebrow">Resultado total</p>
            <div className="mt-1.5">
              <Delta value={pnlUsd} pct={costUsd > 0 ? pnlUsd / costUsd : null} currency="USD" />
            </div>
            <p className="money mt-1 text-xs text-ink-3">≈ {brl(pnlUsd * snap.usdBrl)}</p>
          </div>
        </div>

        {holdings.length > 1 && (
          <div className="mt-6">
            <AllocationBar
              segments={holdings.map((h) => ({ key: h.asset, label: h.asset, value: h.valueBrl, color: styleOf(h.asset).color }))}
            />
            <ul className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-2">
              {holdings.map((h) => (
                <li key={h.asset} className="flex items-center gap-1.5">
                  <span className="size-2 rounded-[2px]" style={{ background: styleOf(h.asset).color }} />
                  {styleOf(h.asset).name}
                  <span className="tnum font-mono text-[11px] text-ink-3">{pctShort(snap.totalBrl ? h.valueBrl / snap.totalBrl : 0)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-5 text-[11px] leading-relaxed text-ink-3">
          Dólar (USDT/BRL): <span className="money">{brl(snap.usdBrl)}</span>. Stablecoins ficam de fora. O preço médio é em US$,
          calculado pelo histórico de compras.
        </p>
        <SourceNotes notes={sourced.notes} tone={sourced.source === "error" ? "error" : "info"} />
      </Card>

      {holdings.map((h) => (
        <HoldingCard key={h.asset} h={h} />
      ))}
    </div>
  );
}

/**
 * Régua preço médio × cotação: mostra onde a cotação está em relação ao
 * seu custo, com a distância em % escrita por extenso.
 */
function CostRuler({ avg, price, color }: { avg: number; price: number; color: string }) {
  const lo = Math.min(avg, price);
  const hi = Math.max(avg, price);
  const pad = (hi - lo) * 0.25 || hi * 0.05;
  const min = lo - pad;
  const span = hi + pad - min;
  const at = (v: number) => ((v - min) / span) * 100;
  const up = price >= avg;

  return (
    <div className="mt-1" role="img" aria-label={`Cotação ${usd(price)}, preço médio ${usd(avg)}`}>
      <div className="relative h-8">
        <div className="absolute inset-x-0 top-1/2 h-px bg-line-strong" />
        <div
          className={cn("absolute top-1/2 h-1 -translate-y-1/2 rounded-full", up ? "bg-pos/50" : "bg-neg/50")}
          style={{ left: `${at(lo)}%`, width: `${at(hi) - at(lo)}%` }}
        />
        <span className="absolute top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink-2" style={{ left: `${at(avg)}%` }} />
        <span
          className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface"
          style={{ left: `${at(price)}%`, background: color }}
        />
      </div>
      <div className="flex justify-between text-[11px] text-ink-3">
        <span>
          <span className="eyebrow mr-1">{up ? "médio" : "cotação"}</span>
          <span className="money">{usd(lo)}</span>
        </span>
        <span>
          <span className="eyebrow mr-1">{up ? "cotação" : "médio"}</span>
          <span className="money">{usd(hi)}</span>
        </span>
      </div>
    </div>
  );
}

function HoldingCard({ h }: { h: CryptoHolding }) {
  const style = styleOf(h.asset);
  const earnShare = h.quantity > 0 ? h.earn / h.quantity : 0;
  const hasResult = h.pnlPct != null && h.pnlUsd != null && h.pnlBrl != null;

  return (
    <Card as="article">
      <div className="flex items-center gap-3">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-lg font-mono text-[11px] font-medium"
          style={{ background: `${style.color}22`, color: style.color, boxShadow: `inset 0 0 0 1px ${style.color}44` }}
        >
          {h.asset}
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium">{style.name}</p>
          <p className="money truncate font-mono text-[11px] text-ink-3">
            {quantity(h.quantity)} {h.asset}
          </p>
        </div>
        <div className="ml-auto text-right">
          <Money value={h.valueBrl} className="text-lg font-semibold tracking-tight" />
          <p className="money font-mono text-[11px] text-ink-3">{usd(h.valueUsd)}</p>
        </div>
      </div>

      <div className="mt-5">
        {h.avgPriceUsd != null ? (
          <>
            <CostRuler avg={h.avgPriceUsd} price={h.priceUsd} color={style.color} />
            {hasResult && (
              <Insight tone={(h.pnlPct ?? 0) >= 0 ? "good" : "bad"} className="mt-3">
                A cotação está{" "}
                <span className={(h.pnlPct ?? 0) >= 0 ? "text-pos" : "text-neg"}>
                  {pctShort(Math.abs(h.pnlPct ?? 0))} {(h.pnlPct ?? 0) >= 0 ? "acima" : "abaixo"}
                </span>{" "}
                do seu preço médio.
              </Insight>
            )}
          </>
        ) : (
          <p className="text-xs text-ink-3">Sem compras no histórico para calcular o preço médio.</p>
        )}
      </div>

      {h.earn > 0 && (
        <div className="mt-5">
          <div className="flex h-1.5 gap-[3px]">
            <div className="h-full rounded-[2px] bg-series-1" style={{ flexGrow: 1 - earnShare, flexBasis: 0 }} />
            <div className="h-full rounded-[2px] bg-series-3" style={{ flexGrow: earnShare, flexBasis: 0 }} />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-ink-2">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-[2px] bg-series-1" />
              Spot <span className="money font-mono text-ink-3">{quantity(h.spot)}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-[2px] bg-series-3" />
              Earn <span className="money font-mono text-ink-3">{quantity(h.earn)}</span> ({pctShort(earnShare)})
            </span>
          </div>
        </div>
      )}

      <dl className="mt-4 divide-y divide-line border-t border-line text-sm">
        <div className="flex items-start justify-between gap-3 py-2.5">
          <dt className="text-ink-3">Cotação</dt>
          <dd className="text-right">
            <p className="money">{brl(h.priceBrl)}</p>
            <p className="money font-mono text-[11px] text-ink-3">{usd(h.priceUsd)}</p>
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3 py-2.5">
          <dt className="text-ink-3">Preço médio</dt>
          <dd className="text-right">
            <p className="money">{h.avgPriceUsd != null ? usd(h.avgPriceUsd) : "—"}</p>
            <p className="text-[11px] text-ink-3">
              {h.avgPriceUsd != null
                ? h.costCoverage < 0.95
                  ? `calculado sobre ${pctShort(h.costCoverage)} da quantidade`
                  : "calculado pelo histórico"
                : "sem compras no histórico"}
            </p>
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3 py-2.5">
          <dt className="text-ink-3">Resultado</dt>
          <dd className="flex flex-col items-end">
            {hasResult ? (
              <>
                <Delta pct={h.pnlPct} />
                <p className="money mt-0.5 text-[11px] text-ink-3">
                  {signedUsd(h.pnlUsd ?? 0)} · ≈ {signedBrl(h.pnlBrl ?? 0)}
                </p>
              </>
            ) : (
              <span className="text-ink-3">—</span>
            )}
          </dd>
        </div>
      </dl>
    </Card>
  );
}

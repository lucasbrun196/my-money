import { Bitcoin } from "lucide-react";
import { AnimatedBRL } from "@/components/ui/animated-number";
import { Card } from "@/components/ui/card";
import { Delta } from "@/components/ui/delta";
import { Money } from "@/components/ui/money";
import { SourceBadge, SourceNotes, Unavailable } from "@/components/ui/source-badge";
import type { CryptoHolding } from "@/domain/types";
import { brl, pctShort, quantity, signedBrl, signedUsd, usd } from "@/lib/format";
import { getCryptoData } from "@/server/services/data";

const ASSET_STYLE: Record<string, { name: string; color: string }> = {
  BTC: { name: "Bitcoin", color: "#c98500" },
  SOL: { name: "Solana", color: "#9085e9" },
};

export async function CryptoSection() {
  const sourced = await getCryptoData();
  const snap = sourced.data;

  if (snap.holdings.length === 0) {
    return (
      <Card title="Binance" icon={<Bitcoin />}>
        <Unavailable sourced={sourced} what="a Binance" />
      </Card>
    );
  }

  // Resultado total só com os ativos que têm preço médio conhecido.
  const withCost = snap.holdings.filter((h) => h.avgPriceUsd != null && h.pnlUsd != null);
  const costUsd = withCost.reduce((s, h) => s + h.quantity * (h.avgPriceUsd ?? 0), 0);
  const pnlUsd = withCost.reduce((s, h) => s + (h.pnlUsd ?? 0), 0);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card title="Carteira Binance" icon={<Bitcoin />} action={<SourceBadge sourced={sourced} />} className="lg:col-span-3">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <AnimatedBRL value={snap.totalBrl} className="text-4xl font-semibold tracking-tight" />
            <p className="money mt-1 text-sm text-ink-3">{usd(snap.totalUsd)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-ink-3">Resultado total</p>
            <Delta value={pnlUsd} pct={costUsd > 0 ? pnlUsd / costUsd : null} currency="USD" />
            <p className="money text-xs text-ink-3">≈ {brl(pnlUsd * snap.usdBrl)}</p>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-ink-3">
          Dólar (USDT/BRL): <span className="money">{brl(snap.usdBrl)}</span> · stablecoins ignoradas · preço médio em US$, calculado pelo histórico de compras
        </p>
        <SourceNotes notes={sourced.notes} tone={sourced.source === "error" ? "error" : "info"} />
      </Card>

      {snap.holdings.map((h, i) => (
        <HoldingCard key={h.asset} h={h} delay={80 * (i + 1)} />
      ))}
    </div>
  );
}

function HoldingCard({ h, delay }: { h: CryptoHolding; delay: number }) {
  const style = ASSET_STYLE[h.asset] ?? { name: h.asset, color: "#3987e5" };
  const earnShare = h.quantity > 0 ? h.earn / h.quantity : 0;

  return (
    <Card delay={delay} className="lg:col-span-1">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-full text-sm font-bold text-bg" style={{ background: style.color }}>
          {h.asset}
        </span>
        <div>
          <p className="font-semibold">{style.name}</p>
          <p className="money text-xs text-ink-3">
            {quantity(h.quantity)} {h.asset}
          </p>
        </div>
        <div className="ml-auto text-right">
          <Money value={h.valueBrl} className="text-lg font-semibold" />
          <p className="money text-xs text-ink-3">{usd(h.valueUsd)}</p>
        </div>
      </div>

      {h.earn > 0 && (
        <div className="mb-4">
          <div className="flex h-2 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full bg-series-1" style={{ width: `${(1 - earnShare) * 100}%` }} />
            <div className="h-full border-l-2 border-surface bg-series-3" style={{ width: `${earnShare * 100}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between text-xs text-ink-2">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-sm bg-series-1" />
              Spot <span className="money text-ink-3">{quantity(h.spot)}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-sm bg-series-3" />
              Earn <span className="money text-ink-3">{quantity(h.earn)}</span> ({pctShort(earnShare)})
            </span>
          </div>
        </div>
      )}

      <dl className="divide-y divide-line text-sm">
        <div className="flex items-start justify-between gap-3 py-2">
          <dt className="text-ink-3">Cotação</dt>
          <dd className="text-right">
            <p className="money">{brl(h.priceBrl)}</p>
            <p className="money text-xs text-ink-3">{usd(h.priceUsd)}</p>
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3 py-2">
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
        <div className="flex items-start justify-between gap-3 py-2">
          <dt className="text-ink-3">Resultado</dt>
          <dd className="flex flex-col items-end">
            {h.pnlPct != null && h.pnlUsd != null && h.pnlBrl != null ? (
              <>
                <Delta pct={h.pnlPct} />
                <p className="money text-xs text-ink-3">
                  {signedUsd(h.pnlUsd)} · ≈ {signedBrl(h.pnlBrl)}
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

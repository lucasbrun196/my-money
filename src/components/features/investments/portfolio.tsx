import { Donut } from "@/components/charts/donut";
import { AnimatedBRL } from "@/components/ui/animated-number";
import { Card } from "@/components/ui/card";
import { Delta } from "@/components/ui/delta";
import { Money } from "@/components/ui/money";
import { SourceBadge, SourceNotes } from "@/components/ui/source-badge";
import { ASSET_CLASS_LABEL, type PortfolioRow } from "@/domain/portfolio";
import { ASSET_CLASS_COLOR } from "@/lib/colors";
import { brl, dateBR, pctShort, quantity } from "@/lib/format";
import { getPortfolioView } from "@/server/services/overview";
import { Insight } from "../shared";

const PRICE_SOURCE: Record<PortfolioRow["priceSource"], string> = {
  pluggy: "Open Finance",
  brapi: "brapi (B3)",
  demo: "demo",
};

export async function PortfolioSection() {
  const { sourced, summary } = await getPortfolioView();
  const institutions = [...new Set(summary.rows.map((r) => r.institution).filter((x): x is string => Boolean(x)))];
  const donut = summary.byClass.map((c) => ({
    name: ASSET_CLASS_LABEL[c.assetClass],
    value: c.value,
    color: ASSET_CLASS_COLOR[c.assetClass],
  }));

  return (
    <div className="stagger grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3">
      <Card
        title="Carteira de investimentos"
        subtitle={institutions.length ? institutions.join(" · ") : undefined}
        action={<SourceBadge sourced={sourced} />}
        className="flex flex-col lg:col-span-2"
      >
        <p className="eyebrow">Valor atual</p>
        <AnimatedBRL value={summary.total} className="mt-1.5 text-[40px] font-semibold tracking-[-0.03em] sm:text-5xl" />
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <span className="text-ink-3">
            Investido <Money value={summary.invested} className="text-ink-2" />
          </span>
          <Delta value={summary.pnl} pct={summary.pnlPct} />
        </div>

        <p className="mt-auto pt-6 text-[11px] text-ink-3">O resultado considera só os ativos com custo conhecido.</p>
        <SourceNotes notes={sourced.notes} />
      </Card>

      <Card title="Alocação" subtitle="Passe o mouse ou toque numa fatia">
        <Donut
          data={donut}
          size={180}
          center={
            <>
              <span className="eyebrow">ativos</span>
              <span className="tnum mt-0.5 text-2xl font-semibold">{summary.rows.length}</span>
            </>
          }
        />
        <ul className="mt-5 space-y-2">
          {summary.byClass.map((c) => (
            <li key={c.assetClass} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2 text-ink-2">
                <span className="size-2 shrink-0 rounded-[2px]" style={{ background: ASSET_CLASS_COLOR[c.assetClass] }} />
                <span className="truncate">{ASSET_CLASS_LABEL[c.assetClass]}</span>
              </span>
              <span className="flex shrink-0 items-baseline gap-2">
                <Money value={c.value} className="text-ink" />
                <span className="tnum w-11 text-right font-mono text-[11px] text-ink-3">{pctShort(c.weight)}</span>
              </span>
            </li>
          ))}
        </ul>
        {summary.byClass.length > 1 && (
          <Insight className="mt-5">
            {(() => {
              const top = [...summary.byClass].sort((a, b) => b.weight - a.weight)[0];
              return (
                <>
                  <span className="text-ink">{ASSET_CLASS_LABEL[top.assetClass]}</span> concentra {pctShort(top.weight)} da carteira.
                </>
              );
            })()}
          </Insight>
        )}
      </Card>

      <Card title="Posições" subtitle={`${summary.rows.length} ${summary.rows.length === 1 ? "ativo" : "ativos"}, do maior para o menor`} className="lg:col-span-3">
        {/* Celular: cards. Desktop: tabela. */}
        <ul className="space-y-2 md:hidden">
          {summary.rows.map((r) => (
            <li key={r.id} className="relative overflow-hidden rounded-lg border border-line p-3 pl-4">
              <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: ASSET_CLASS_COLOR[r.assetClass] }} />
              <div className="flex items-start justify-between gap-3">
                <PositionHeader r={r} />
                <Money value={r.value} className="shrink-0 text-sm font-medium" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-y-1.5 text-xs">
                {r.quantity != null && r.avgPrice != null && (
                  <>
                    <span className="text-ink-3">Qtd × PM</span>
                    <span className="money text-right text-ink-2">
                      {quantity(r.quantity, 2)} × {brl(r.avgPrice)}
                    </span>
                  </>
                )}
                {r.currentPrice != null && (
                  <>
                    <span className="text-ink-3">Cotação</span>
                    <span className="money text-right text-ink-2">{brl(r.currentPrice)}</span>
                  </>
                )}
                <span className="text-ink-3">Resultado</span>
                <span className="text-right">
                  <ResultCell r={r} />
                </span>
              </div>
              <WeightBar r={r} />
            </li>
          ))}
        </ul>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="eyebrow py-2.5 font-normal">Ativo</th>
                <th className="eyebrow py-2.5 text-right font-normal">Qtd</th>
                <th className="eyebrow py-2.5 text-right font-normal">Preço médio</th>
                <th className="eyebrow py-2.5 text-right font-normal">Cotação</th>
                <th className="eyebrow py-2.5 text-right font-normal">Valor atual</th>
                <th className="eyebrow py-2.5 text-right font-normal">Resultado</th>
                <th className="eyebrow w-40 py-2.5 pl-6 font-normal">Peso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {summary.rows.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-surface-2/60">
                  <td className="py-3 pr-4">
                    <PositionHeader r={r} />
                  </td>
                  <td className="tnum py-3 text-right text-ink-2">{r.quantity != null ? quantity(r.quantity, 2) : "—"}</td>
                  <td className="py-3 text-right text-ink-2">{r.avgPrice != null ? <Money value={r.avgPrice} /> : "—"}</td>
                  <td className="py-3 text-right text-ink-2">{r.currentPrice != null ? <Money value={r.currentPrice} /> : "—"}</td>
                  <td className="py-3 text-right font-medium">
                    <Money value={r.value} />
                  </td>
                  <td className="py-3 text-right">
                    <ResultCell r={r} />
                  </td>
                  <td className="py-3 pl-6">
                    <WeightBar r={r} compact />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/** Resultado, ou o motivo de não haver (custo não informado / histórico incompleto). */
function ResultCell({ r }: { r: PortfolioRow }) {
  if (r.pnl != null) return <Delta value={r.pnl} pct={r.pnlPct} size="xs" />;
  const text =
    r.costCoverage != null && r.costCoverage > 0
      ? `histórico incompleto (${pctShort(r.costCoverage)})`
      : "custo não informado";
  return (
    <span className="text-[11px] text-ink-3" title="O Open Finance não trouxe compras suficientes para calcular o preço médio">
      {text}
    </span>
  );
}

function PositionHeader({ r }: { r: PortfolioRow }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="hidden size-2 shrink-0 rounded-[2px] md:block" style={{ background: ASSET_CLASS_COLOR[r.assetClass] }} />
      <div className="min-w-0">
        <p className="truncate font-medium">{r.name}</p>
        <p className="truncate text-[11px] text-ink-3">
          {r.institution ? `${r.institution} · ` : ""}
          {ASSET_CLASS_LABEL[r.assetClass]} · {PRICE_SOURCE[r.priceSource]}
          {r.updatedAt && r.priceSource !== "brapi" && ` · ${dateBR(r.updatedAt.slice(0, 10))}`}
        </p>
      </div>
    </div>
  );
}

function WeightBar({ r, compact = false }: { r: PortfolioRow; compact?: boolean }) {
  return (
    <div className={compact ? "flex items-center gap-2" : "mt-3 flex items-center gap-2"}>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full rounded-full transition-[width] duration-[1200ms] ease-out-expo starting:w-0"
          style={{ width: `${r.weight * 100}%`, background: ASSET_CLASS_COLOR[r.assetClass] }}
        />
      </div>
      <span className="tnum w-11 text-right font-mono text-[11px] text-ink-3">{pctShort(r.weight)}</span>
    </div>
  );
}

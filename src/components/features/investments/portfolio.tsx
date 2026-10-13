import { ChartPie, Landmark } from "lucide-react";
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
    <div className="grid gap-4 lg:grid-cols-3">
      <Card
        title="Investimentos"
        subtitle={institutions.length ? institutions.join(" · ") : undefined}
        icon={<Landmark />}
        action={<SourceBadge sourced={sourced} />}
        className="lg:col-span-2"
      >
        <AnimatedBRL value={summary.total} className="text-4xl font-semibold tracking-tight" />
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="text-ink-3">
            Investido <Money value={summary.invested} className="text-ink-2" />
          </span>
          <Delta value={summary.pnl} pct={summary.pnlPct} />
        </div>
        <p className="mt-1 text-[11px] text-ink-3">Resultado considera só os ativos com custo conhecido.</p>
        <SourceNotes notes={sourced.notes} />
      </Card>

      <Card title="Alocação" icon={<ChartPie />}>
        <Donut
          data={donut}
          size={170}
          center={
            <>
              <span className="text-[11px] text-ink-3">ativos</span>
              <span className="text-xl font-semibold">{summary.rows.length}</span>
            </>
          }
        />
        <ul className="mt-4 space-y-1.5">
          {summary.byClass.map((c) => (
            <li key={c.assetClass} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-ink-2">
                <span className="size-2.5 rounded-sm" style={{ background: ASSET_CLASS_COLOR[c.assetClass] }} />
                {ASSET_CLASS_LABEL[c.assetClass]}
              </span>
              <span className="text-ink-3 tabular-nums">{pctShort(c.weight)}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Posições" className="lg:col-span-3">
        {/* Celular: cards. Desktop: tabela. */}
        <ul className="space-y-2 md:hidden">
          {summary.rows.map((r) => (
            <li key={r.id} className="rounded-xl bg-surface-2 p-3">
              <PositionHeader r={r} />
              <div className="mt-2 grid grid-cols-2 gap-y-1 text-xs">
                <span className="text-ink-3">Valor atual</span>
                <Money value={r.value} className="text-right text-sm font-medium" />
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
                <span className="text-right"><ResultCell r={r} /></span>
              </div>
              <WeightBar r={r} />
            </li>
          ))}
        </ul>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-3">
                <th className="py-2 font-medium">Ativo</th>
                <th className="py-2 text-right font-medium">Qtd</th>
                <th className="py-2 text-right font-medium">Preço médio</th>
                <th className="py-2 text-right font-medium">Cotação</th>
                <th className="py-2 text-right font-medium">Valor atual</th>
                <th className="py-2 text-right font-medium">Resultado</th>
                <th className="w-40 py-2 pl-6 font-medium">Peso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {summary.rows.map((r) => (
                <tr key={r.id} className="hover:bg-surface-2/60">
                  <td className="py-3">
                    <PositionHeader r={r} />
                  </td>
                  <td className="py-3 text-right tabular-nums text-ink-2">{r.quantity != null ? quantity(r.quantity, 2) : "—"}</td>
                  <td className="py-3 text-right text-ink-2">{r.avgPrice != null ? <Money value={r.avgPrice} /> : "—"}</td>
                  <td className="py-3 text-right text-ink-2">{r.currentPrice != null ? <Money value={r.currentPrice} /> : "—"}</td>
                  <td className="py-3 text-right font-medium">
                    <Money value={r.value} />
                  </td>
                  <td className="py-3 text-right"><ResultCell r={r} /></td>
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
    <div className="flex items-center gap-2.5">
      <span className="size-2.5 shrink-0 rounded-sm" style={{ background: ASSET_CLASS_COLOR[r.assetClass] }} />
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
    <div className={compact ? "flex items-center gap-2" : "mt-2 flex items-center gap-2"}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full rounded-full transition-[width] duration-1000 starting:w-0"
          style={{ width: `${r.weight * 100}%`, background: ASSET_CLASS_COLOR[r.assetClass] }}
        />
      </div>
      <span className="w-11 text-right text-xs text-ink-3 tabular-nums">{pctShort(r.weight)}</span>
    </div>
  );
}

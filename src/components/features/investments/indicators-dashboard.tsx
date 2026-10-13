"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { Delta } from "@/components/ui/delta";
import {
  formatIndicator,
  GROUP_ORDER,
  periodChange,
  type Indicator,
  type IndicatorPoint,
} from "@/domain/indicators";
import { addDays } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { dateBR, dateShort, dateTimeBR, signedPct } from "@/lib/format";

const RANGES = [
  { id: "1m", label: "1M", days: 31 },
  { id: "3m", label: "3M", days: 92 },
  { id: "6m", label: "6M", days: 183 },
  { id: "1a", label: "1A", days: 366 },
] as const;
type RangeId = (typeof RANGES)[number]["id"];

const COLOR = "#3987e5";

/** Painel: escolha um ativo/indicador e veja valor, variação, gráfico e números-chave. */
export function IndicatorsDashboard({ indicators, notes }: { indicators: Indicator[]; notes: string[] }) {
  const [selectedId, setSelectedId] = useState(indicators[0]?.id ?? "");
  const [range, setRange] = useState<RangeId>("3m");
  const selected = indicators.find((i) => i.id === selectedId) ?? indicators[0];

  const groups = useMemo(
    () => GROUP_ORDER.map((g) => ({ group: g, items: indicators.filter((i) => i.group === g) })).filter((g) => g.items.length),
    [indicators],
  );

  // Períodos possíveis para o indicador escolhido (depende do histórico que a fonte entrega).
  const span = selected?.history.length
    ? Math.round((Date.parse(selected.history[selected.history.length - 1].date) - Date.parse(selected.history[0].date)) / 86_400_000)
    : 0;
  const available = RANGES.filter((r, i) => i === 0 || span >= r.days * 0.8);
  const activeRange = available.find((r) => r.id === range) ?? available[available.length - 1];

  const lastDate = selected?.history[selected.history.length - 1]?.date;
  const points: IndicatorPoint[] =
    selected && lastDate ? selected.history.filter((p) => p.date >= addDays(lastDate, -activeRange.days)) : [];

  if (!selected) {
    return <p className="text-sm text-ink-3">Nenhum indicador disponível agora.</p>;
  }

  const change = periodChange(points, selected.unit);
  const values = points.map((p) => p.value);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const pad = (max - min) * 0.1 || Math.abs(max) * 0.01 || 1;

  return (
    <div className="space-y-5">
      {/* Seletor */}
      <div className="space-y-3">
        {groups.map(({ group, items }) => (
          <div key={group}>
            <p className="mb-1.5 text-[11px] font-medium tracking-wide text-ink-3 uppercase">{group}</p>
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
              {items.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => setSelectedId(i.id)}
                  aria-pressed={i.id === selected.id}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    i.id === selected.id ? "border-brand/40 bg-brand/10 text-brand" : "border-line text-ink-2 hover:border-line-strong",
                  )}
                >
                  {i.label}
                  {i.changePct != null && (
                    <span className={i.changePct >= 0 ? "text-pos" : "text-neg"}>{signedPct(i.changePct)}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Destaque do selecionado */}
      <div className="rounded-2xl border border-line bg-surface-2/60 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">{selected.label}</p>
            {selected.subtitle && <p className="truncate text-xs text-ink-3">{selected.subtitle}</p>}
            <p className="money mt-2 text-3xl font-semibold tracking-tight">{formatIndicator(selected.value, selected.unit)}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
              {selected.changePct != null ? (
                <span className="flex items-center gap-1">
                  <Delta pct={selected.changePct} size="xs" /> hoje
                </span>
              ) : selected.changeAbs != null && selected.changeAbs !== 0 ? (
                <span>
                  {selected.changeAbs > 0 ? "+" : "−"}
                  {Math.abs(selected.changeAbs).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} p.p. na última leitura
                </span>
              ) : null}
              <span>
                {selected.asOf.length > 10 ? `às ${dateTimeBR(selected.asOf)}` : `ref. ${dateBR(selected.asOf)}`}
              </span>
            </div>
          </div>

          <div className="flex rounded-xl bg-surface-3 p-1" role="tablist" aria-label="Período do gráfico">
            {RANGES.map((r) => {
              const enabled = available.some((a) => a.id === r.id);
              return (
                <button
                  key={r.id}
                  role="tab"
                  type="button"
                  disabled={!enabled}
                  aria-selected={activeRange.id === r.id}
                  onClick={() => setRange(r.id)}
                  title={enabled ? undefined : "Histórico indisponível para esse período"}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                    activeRange.id === r.id ? "bg-surface text-ink shadow" : "text-ink-3 hover:text-ink-2",
                    !enabled && "cursor-not-allowed opacity-30",
                  )}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        {change && (
          <p className="mt-3 text-xs text-ink-3">
            No período:{" "}
            {change.pct != null ? (
              <span className={change.pct >= 0 ? "text-pos" : "text-neg"}>{signedPct(change.pct)}</span>
            ) : (
              <span className={change.abs >= 0 ? "text-pos" : "text-neg"}>
                {change.abs >= 0 ? "+" : "−"}
                {Math.abs(change.abs).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} p.p.
              </span>
            )}{" "}
            · mín. {formatIndicator(min, selected.unit)} · máx. {formatIndicator(max, selected.unit)}
          </p>
        )}

        {points.length > 1 ? (
          <AreaChart
            key={`${selected.id}-${activeRange.id}`}
            responsive
            data={points}
            style={{ width: "100%", height: 240 }}
            margin={{ top: 12, right: 8, bottom: 0, left: 4 }}
          >
            <defs>
              <linearGradient id="indFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLOR} stopOpacity={0.3} />
                <stop offset="100%" stopColor={COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgb(255 255 255 / 0.05)" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--color-ink-3)", fontSize: 10 }}
              tickFormatter={(d: string) => dateShort(d)}
              minTickGap={24}
            />
            <YAxis
              width={64}
              tickLine={false}
              axisLine={false}
              domain={[min - pad, max + pad]}
              tick={{ fill: "var(--color-ink-3)", fontSize: 10 }}
              tickFormatter={(v: number) => formatIndicator(v, selected.unit).replace("R$ ", "").replace(" pts", "")}
            />
            <Tooltip
              cursor={{ stroke: "rgb(255 255 255 / 0.25)", strokeWidth: 1 }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as IndicatorPoint | undefined;
                if (!active || !p) return null;
                return (
                  <div className="rounded-lg border border-line-strong bg-surface-2 px-3 py-2 text-xs shadow-xl">
                    <div className="text-ink-3">{dateBR(p.date)}</div>
                    <div className="money font-medium text-ink">{formatIndicator(p.value, selected.unit)}</div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={COLOR}
              strokeWidth={2}
              fill="url(#indFill)"
              dot={false}
              activeDot={{ r: 5, fill: COLOR, stroke: "var(--color-surface)", strokeWidth: 2 }}
              animationDuration={600}
            />
          </AreaChart>
        ) : (
          <p className="py-10 text-center text-sm text-ink-3">Sem histórico para exibir.</p>
        )}

        {selected.historyNote && <p className="mt-1 text-[11px] text-ink-3">{selected.historyNote}</p>}
      </div>

      {/* Números-chave */}
      {selected.stats.length > 0 && (
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {selected.stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-surface-2 px-3 py-2.5">
              <dt className="text-[11px] text-ink-3">{s.label}</dt>
              <dd className="money mt-0.5 text-sm font-medium">{s.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <p className="text-[11px] text-ink-3">Fonte: {selected.source}</p>
      {notes.length > 0 && (
        <details className="text-[11px] text-ink-3">
          <summary className="cursor-pointer">Alguns indicadores não carregaram ({notes.length})</summary>
          <ul className="mt-1 list-disc pl-4">
            {notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { Sparkline } from "@/components/charts/sparkline";
import { AXIS_TICK, GRID_STROKE, TooltipBox } from "@/components/charts/tooltip";
import { Delta } from "@/components/ui/delta";
import { ExplainedStat } from "@/components/ui/explained-stat";
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
  { id: "1m", label: "1M", long: "no último mês", days: 31 },
  { id: "3m", label: "3M", long: "nos últimos 3 meses", days: 92 },
  { id: "6m", label: "6M", long: "nos últimos 6 meses", days: 183 },
  { id: "1a", label: "1A", long: "no último ano", days: 366 },
] as const;
type RangeId = (typeof RANGES)[number]["id"];

const UP = "#4ade80";
const DOWN = "#f87171";

function pp(abs: number) {
  return `${abs >= 0 ? "+" : "−"}${Math.abs(abs).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} p.p.`;
}

/** Painel: escolha um ativo/indicador e veja valor, variação, gráfico e números-chave. */
export function IndicatorsDashboard({ indicators, notes }: { indicators: Indicator[]; notes: string[] }) {
  const gid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [selectedId, setSelectedId] = useState(indicators[0]?.id ?? "");
  const [range, setRange] = useState<RangeId>("3m");
  const selected = indicators.find((i) => i.id === selectedId) ?? indicators[0];

  const groups = useMemo(
    () => GROUP_ORDER.map((g) => ({ group: g, items: indicators.filter((i) => i.group === g) })).filter((g) => g.items.length),
    [indicators],
  );

  if (!selected) {
    return <p className="text-sm text-ink-3">Nenhum indicador disponível agora.</p>;
  }

  // Períodos possíveis para o indicador escolhido (depende do histórico que a fonte entrega).
  const span = selected.history.length
    ? Math.round((Date.parse(selected.history[selected.history.length - 1].date) - Date.parse(selected.history[0].date)) / 86_400_000)
    : 0;
  const available = RANGES.filter((r, i) => i === 0 || span >= r.days * 0.8);
  const activeRange = available.find((r) => r.id === range) ?? available[available.length - 1];
  const rangeIndex = RANGES.findIndex((r) => r.id === activeRange.id);

  const lastDate = selected.history[selected.history.length - 1]?.date;
  const points: IndicatorPoint[] = lastDate ? selected.history.filter((p) => p.date >= addDays(lastDate, -activeRange.days)) : [];

  const change = periodChange(points, selected.unit);
  const values = points.map((p) => p.value);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const pad = (max - min) * 0.12 || Math.abs(max) * 0.01 || 1;
  const up = (change?.abs ?? 0) >= 0;
  const color = up ? UP : DOWN;

  return (
    <div className="space-y-6">
      {/* Seletor: blocos com minigráfico, agrupados */}
      <div className="flex flex-wrap gap-x-6 gap-y-4">
        {groups.map(({ group, items }) => (
          <div key={group} className="max-w-full min-w-0">
            <p className="eyebrow mb-2">{group}</p>
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {items.map((i) => {
                const on = i.id === selected.id;
                return (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => setSelectedId(i.id)}
                    aria-pressed={on}
                    className={cn(
                      "group w-36 shrink-0 rounded-lg border p-2.5 text-left transition-all duration-300 active:scale-[0.98]",
                      on ? "border-ink/60 bg-surface-2" : "border-line hover:border-line-strong hover:bg-surface-2/50",
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className={cn("truncate text-xs font-medium", on ? "text-ink" : "text-ink-2")}>{i.label}</span>
                      {i.changePct != null && (
                        <span className={cn("tnum shrink-0 font-mono text-[10.5px]", i.changePct >= 0 ? "text-pos" : "text-neg")}>
                          {signedPct(i.changePct)}
                        </span>
                      )}
                    </span>
                    <span className="money mt-1 block truncate text-[13px] font-medium text-ink">{formatIndicator(i.value, i.unit)}</span>
                    <Sparkline
                      values={i.history.slice(-30).map((p) => p.value)}
                      color={on ? "var(--color-ink)" : "var(--color-ink-3)"}
                      width={112}
                      height={22}
                      className="mt-1.5 w-full transition-colors"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Destaque do selecionado */}
      <div key={selected.id} className="animate-fade rounded-xl border border-line bg-surface-2/40 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium">{selected.label}</p>
            {selected.subtitle && <p className="truncate text-xs text-ink-3">{selected.subtitle}</p>}
            <p className="money mt-2 text-[34px] leading-tight font-semibold tracking-[-0.03em]">{formatIndicator(selected.value, selected.unit)}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
              {selected.changePct != null ? (
                <span className="flex items-center gap-1">
                  <Delta pct={selected.changePct} size="xs" /> hoje
                </span>
              ) : selected.changeAbs != null && selected.changeAbs !== 0 ? (
                <span>{pp(selected.changeAbs)} na última leitura</span>
              ) : null}
              <span>{selected.asOf.length > 10 ? `às ${dateTimeBR(selected.asOf)}` : `ref. ${dateBR(selected.asOf)}`}</span>
            </div>
          </div>

          <div className="relative grid grid-cols-4 rounded-lg bg-surface-3/70 p-1" role="tablist" aria-label="Período do gráfico">
            <span
              aria-hidden
              className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/4)] rounded-md bg-surface shadow transition-transform duration-500 ease-out-expo"
              style={{ transform: `translateX(${rangeIndex * 100}%)` }}
            />
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
                    "relative w-10 rounded-md py-1 font-mono text-[11px] font-medium transition-colors",
                    activeRange.id === r.id ? "text-ink" : "text-ink-3 hover:text-ink-2",
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
          <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-2">
            <span className={cn("inline-flex items-center gap-0.5 font-medium", up ? "text-pos" : "text-neg")}>
              {up ? <ArrowUpRight className="size-4" aria-hidden /> : <ArrowDownRight className="size-4" aria-hidden />}
              {change.pct != null ? signedPct(change.pct) : pp(change.abs)}
            </span>
            {activeRange.long}
            <span className="text-ink-3">
              · mín. {formatIndicator(min, selected.unit)} · máx. {formatIndicator(max, selected.unit)}
            </span>
          </p>
        )}

        {points.length > 1 ? (
          <AreaChart
            key={`${selected.id}-${activeRange.id}`}
            responsive
            data={points}
            style={{ width: "100%", height: 250 }}
            margin={{ top: 16, right: 8, bottom: 0, left: 4 }}
            className="mt-2"
          >
            <defs>
              <linearGradient id={`ind-${gid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={GRID_STROKE} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={AXIS_TICK} tickFormatter={(d: string) => dateShort(d)} minTickGap={28} />
            <YAxis
              width={64}
              tickLine={false}
              axisLine={false}
              domain={[min - pad, max + pad]}
              tick={AXIS_TICK}
              tickFormatter={(v: number) => formatIndicator(v, selected.unit).replace("R$ ", "").replace(" pts", "")}
            />
            <ReferenceLine
              y={points[0].value}
              stroke="var(--color-ink-2)"
              strokeOpacity={0.45}
              strokeDasharray="2 4"
              label={{ value: "início", position: "insideBottomLeft", fill: "var(--color-ink-3)", fontSize: 10, fontFamily: "var(--font-mono)" }}
            />
            <Tooltip
              cursor={{ stroke: "rgb(255 248 230 / 0.25)", strokeWidth: 1 }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as IndicatorPoint | undefined;
                if (!active || !p) return null;
                const vsStart = periodChange([points[0], p], selected.unit);
                return (
                  <TooltipBox title={dateBR(p.date)}>
                    <div className="money text-sm font-medium text-ink">{formatIndicator(p.value, selected.unit)}</div>
                    {vsStart && p.date !== points[0].date && (
                      <div className={cn("mt-0.5", vsStart.abs >= 0 ? "text-pos" : "text-neg")}>
                        {vsStart.pct != null ? signedPct(vsStart.pct) : pp(vsStart.abs)} desde o início
                      </div>
                    )}
                  </TooltipBox>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={1.75}
              fill={`url(#ind-${gid})`}
              dot={false}
              activeDot={{ r: 5, fill: color, stroke: "var(--color-surface)", strokeWidth: 2 }}
              animationDuration={900}
              animationEasing="ease-out"
            />
          </AreaChart>
        ) : (
          <p className="py-10 text-center text-sm text-ink-3">Sem histórico para exibir.</p>
        )}

        {selected.historyNote && <p className="mt-2 text-[11px] text-ink-3">{selected.historyNote}</p>}
      </div>

      {/* Números-chave */}
      {selected.stats.length > 0 && (
        <div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {selected.stats.map((s) => (
              <ExplainedStat key={`${selected.id}-${s.label}`} label={s.label} value={s.value} />
            ))}
          </div>
          <p className="mt-2 text-[11px] text-ink-3">Passe o mouse ou toque numa caixinha para ver o que o número significa.</p>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-2 text-[11px] text-ink-3">
        <p>Fonte: {selected.source}</p>
        {notes.length > 0 && (
          <details className="max-w-full">
            <summary className="cursor-pointer hover:text-ink-2">Alguns indicadores não carregaram ({notes.length})</summary>
            <ul className="mt-1 list-disc pl-4">
              {notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}

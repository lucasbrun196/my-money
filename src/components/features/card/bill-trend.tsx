"use client";

import { useId, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS_TICK, GRID_STROKE, TooltipBox } from "@/components/charts/tooltip";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import { axisShort, brl, dateShort, monthLabel, pctShort } from "@/lib/format";
import { PeriodSummary, type SummaryData } from "../period-summary";
import { Insight } from "../shared";

export type MonthlyBill = {
  month: string; // AAAA-MM (mês do vencimento: identificador)
  ref: string; // AAAA-MM (mês de referência: o nome que o banco usa)
  total: number;
  open: boolean; // fatura aberta (valor parcial)
  details: SummaryData;
};

/** Dia do ciclo aberto; `total` é null nos dias que ainda não chegaram. */
export type CycleDay = { date: string; total: number | null };

type Range = "atual" | "6m" | "12m" | `ano-${string}`;
type Point = { key: string; label: string; tooltip: string; value: number | null; projection?: number | null; open: boolean };

const COLOR = "#3987e5";

/**
 * Evolução das faturas em área. "Mês atual" mostra a fatura aberta
 * acumulando dia a dia, com a previsão até o fechamento tracejada; os
 * demais períodos mostram o total de cada fatura e a média do período.
 */
export function BillTrend({
  monthly,
  cycle,
  target,
  forecast,
  currentDetails,
}: {
  monthly: MonthlyBill[];
  cycle: CycleDay[];
  target: number;
  forecast: number;
  currentDetails: SummaryData;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [range, setRange] = useState<Range>("atual");
  const [selected, setSelected] = useState<SummaryData | null>(null);

  const years = useMemo(() => [...new Set(monthly.map((m) => m.ref.slice(0, 4)))].sort().reverse(), [monthly]);

  const points = useMemo<Point[]>(() => {
    if (range === "atual") {
      const lastReal = cycle.findLastIndex((d) => d.total != null);
      const hasFuture = lastReal >= 0 && lastReal < cycle.length - 1;
      return cycle.map((d, i) => ({
        key: d.date,
        label: dateShort(d.date),
        tooltip: dateShort(d.date),
        value: d.total,
        // Previsão: liga o último valor real ao previsto no fechamento.
        projection: hasFuture ? (i === lastReal ? d.total : i === cycle.length - 1 ? forecast : null) : null,
        open: true,
      }));
    }
    const sorted = [...monthly].sort((a, b) => (a.month < b.month ? -1 : 1));
    const list = range.startsWith("ano-")
      ? sorted.filter((m) => m.ref.startsWith(range.slice(4)))
      : sorted.slice(range === "6m" ? -6 : -12);
    return list.map((m) => ({
      label: monthLabel(m.ref).replace(/\/\d{2}(\d{2})$/, "/$1"),
      tooltip: `Fatura de ${monthLabel(m.ref)}${m.open ? " (aberta)" : ""}`,
      value: m.total,
      open: m.open,
      key: m.month,
    }));
  }, [range, monthly, cycle, forecast]);

  // Média das faturas fechadas visíveis (a aberta é parcial e distorceria).
  const closedValues = points.filter((p) => !p.open && p.value != null).map((p) => p.value as number);
  const average = range !== "atual" && closedValues.length >= 2 ? closedValues.reduce((s, v) => s + v, 0) / closedValues.length : null;

  // Frase-resumo: a previsão desta fatura contra a média das últimas 6 fechadas.
  const recent = monthly.filter((m) => !m.open).slice(-6);
  const recentAvg = recent.length ? recent.reduce((s, m) => s + m.total, 0) / recent.length : null;
  const vsAvg = recentAvg ? forecast / recentAvg - 1 : null;

  const open = (index: number) => {
    if (range === "atual") return setSelected(currentDetails);
    const p = points[index];
    const m = p && monthly.find((x) => x.month === p.key);
    if (m) setSelected(m.details);
  };

  const values = points.flatMap((p) => [p.value ?? 0, p.projection ?? 0]);
  const max = Math.max(target, ...values);
  const chip = (rid: Range, label: string) => (
    <button
      key={rid}
      type="button"
      onClick={() => setRange(rid)}
      aria-pressed={range === rid}
      className={cn(
        "shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all duration-200 active:scale-95",
        range === rid ? "border-ink bg-ink text-bg" : "border-line-strong text-ink-2 hover:border-ink-3 hover:text-ink",
      )}
    >
      {label}
    </button>
  );

  return (
    <div>
      {vsAvg != null && recentAvg != null && (
        <Insight tone={vsAvg > 0.15 ? "warning" : "neutral"} className="mb-4">
          A previsão desta fatura (<span className="money text-ink">{brl(forecast)}</span>) está{" "}
          {Math.abs(vsAvg) < 0.03 ? (
            "na média"
          ) : (
            <span className={vsAvg > 0 ? "text-neg" : "text-pos"}>
              {pctShort(Math.abs(vsAvg))} {vsAvg > 0 ? "acima" : "abaixo"} da média
            </span>
          )}{" "}
          das últimas {recent.length} faturas (<span className="money">{brl(recentAvg)}</span>).
        </Insight>
      )}

      <div className="no-scrollbar -mx-1 mb-4 flex items-center gap-1.5 overflow-x-auto px-1">
        {chip("atual", "Mês atual")}
        {chip("6m", "6 meses")}
        {chip("12m", "12 meses")}
        <select
          aria-label="Ano"
          value={range.startsWith("ano-") ? range.slice(4) : ""}
          onChange={(e) => e.target.value && setRange(`ano-${e.target.value}`)}
          className={cn(
            "shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-medium outline-none",
            range.startsWith("ano-") ? "border-ink bg-ink text-bg" : "border-line-strong bg-surface text-ink-2",
          )}
        >
          <option value="">Ano…</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {points.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-3">Sem faturas neste período.</p>
      ) : (
        // O clique fica no contêiner e o ponto é calculado pela posição X do toque na área do
        // gráfico (o estado de hover do Recharts só atualiza no próximo frame, o que falha em toques).
        <div
          onClick={(e) => {
            const grid = e.currentTarget.querySelector(".recharts-cartesian-grid")?.getBoundingClientRect();
            if (!grid || points.length === 0) return;
            const step = points.length > 1 ? grid.width / (points.length - 1) : 1;
            const idx = Math.round((e.clientX - grid.left) / step);
            open(Math.min(Math.max(idx, 0), points.length - 1));
          }}
        >
          <AreaChart
            key={range}
            responsive
            data={points}
            style={{ width: "100%", height: 240, cursor: "pointer" }}
            margin={{ top: 16, right: 8, bottom: 0, left: 4 }}
          >
            <defs>
              <linearGradient id={`bill-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLOR} stopOpacity={0.32} />
                <stop offset="100%" stopColor={COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={GRID_STROKE} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS_TICK} interval="preserveStartEnd" minTickGap={14} />
            <YAxis width={36} tickLine={false} axisLine={false} domain={[0, Math.ceil(max * 1.12)]} tick={AXIS_TICK} tickFormatter={axisShort} />
            <ReferenceLine
              y={target}
              stroke="var(--color-good)"
              strokeOpacity={0.7}
              strokeDasharray="4 4"
              label={{ value: `meta ${axisShort(target)}`, position: "insideTopRight", fill: "var(--color-good)", fontSize: 10, fontFamily: "var(--font-mono)" }}
            />
            {average != null && (
              <ReferenceLine
                y={average}
                stroke="var(--color-ink-2)"
                strokeOpacity={0.5}
                strokeDasharray="2 4"
                label={{ value: `média ${axisShort(average)}`, position: "insideTopLeft", fill: "var(--color-ink-2)", fontSize: 10, fontFamily: "var(--font-mono)" }}
              />
            )}
            <Tooltip
              cursor={{ stroke: "rgb(255 248 230 / 0.25)", strokeWidth: 1 }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as Point | undefined;
                if (!active || !p) return null;
                const isFuture = p.value == null;
                return (
                  <TooltipBox title={range === "atual" ? (isFuture ? `Previsto em ${p.tooltip}` : `Até ${p.tooltip}`) : p.tooltip}>
                    <div className="money text-sm font-medium text-ink">
                      {isFuture ? (p.projection != null ? brl(p.projection) : "—") : brl(p.value ?? 0)}
                    </div>
                    {!isFuture && target > 0 && (
                      <div className="mt-0.5 text-ink-3">{pctShort((p.value ?? 0) / target)} da meta</div>
                    )}
                  </TooltipBox>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={COLOR}
              strokeWidth={2}
              fill={`url(#bill-${id})`}
              connectNulls={false}
              dot={range === "atual" ? false : { r: 3.5, fill: COLOR, stroke: "var(--color-surface)", strokeWidth: 2 }}
              activeDot={{ r: 5.5, fill: COLOR, stroke: "var(--color-surface)", strokeWidth: 2 }}
              animationDuration={1100}
              animationEasing="ease-out"
            />
            {range === "atual" && (
              <Line
                type="linear"
                dataKey="projection"
                stroke={COLOR}
                strokeOpacity={0.7}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                connectNulls
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            )}
          </AreaChart>
        </div>
      )}
      <p className="mt-2 text-[11px] text-ink-3">
        {range === "atual"
          ? "Valor acumulado da fatura aberta dia a dia. O tracejado azul vai até a previsão no fechamento; o verde é a meta da anuidade."
          : "Total de cada fatura (a do mês atual é parcial). Tracejado cinza: média das fechadas; verde: meta da anuidade."}
      </p>

      <Sheet open={selected !== null} onClose={() => setSelected(null)} title={selected?.title ?? ""} subtitle={selected?.subtitle}>
        {selected && <PeriodSummary data={selected} />}
      </Sheet>
    </div>
  );
}

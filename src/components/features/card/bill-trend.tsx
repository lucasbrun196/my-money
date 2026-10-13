"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import { axisShort, brl, dateShort, monthLabel } from "@/lib/format";
import { PeriodSummary, type SummaryData } from "../period-summary";

export type MonthlyBill = {
  month: string; // AAAA-MM (mês do vencimento)
  total: number;
  open: boolean; // fatura aberta (valor parcial)
  details: SummaryData;
};

export type CycleDay = { date: string; total: number };

type Range = "atual" | "6m" | "12m" | `ano-${string}`;

const COLOR = "#3987e5";

/**
 * Evolução das faturas em linha. "Mês atual" mostra a fatura aberta
 * acumulando dia a dia; os demais períodos mostram o total de cada fatura.
 */
export function BillTrend({
  monthly,
  cycle,
  target,
  currentDetails,
}: {
  monthly: MonthlyBill[];
  cycle: CycleDay[];
  target: number;
  currentDetails: SummaryData;
}) {
  const [range, setRange] = useState<Range>("atual");
  const [selected, setSelected] = useState<SummaryData | null>(null);

  const years = useMemo(() => [...new Set(monthly.map((m) => m.month.slice(0, 4)))].sort().reverse(), [monthly]);

  const points = useMemo(() => {
    if (range === "atual") {
      return cycle.map((d) => ({ label: dateShort(d.date), tooltip: dateShort(d.date), value: d.total, open: true, key: d.date }));
    }
    const sorted = [...monthly].sort((a, b) => (a.month < b.month ? -1 : 1));
    const list = range.startsWith("ano-")
      ? sorted.filter((m) => m.month.startsWith(range.slice(4)))
      : sorted.slice(range === "6m" ? -6 : -12);
    return list.map((m) => ({
      label: monthLabel(m.month).replace(/\/\d{2}(\d{2})$/, "/$1"),
      tooltip: `Fatura de ${monthLabel(m.month)}${m.open ? " (aberta)" : ""}`,
      value: m.total,
      open: m.open,
      key: m.month,
    }));
  }, [range, monthly, cycle]);

  const open = (index: number) => {
    if (range === "atual") return setSelected(currentDetails);
    const p = points[index];
    const m = p && monthly.find((x) => x.month === p.key);
    if (m) setSelected(m.details);
  };

  const max = Math.max(target, ...points.map((p) => p.value));
  const chip = (id: Range, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setRange(id)}
      aria-pressed={range === id}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        range === id ? "border-brand/40 bg-brand/10 text-brand" : "border-line text-ink-2 hover:border-line-strong",
      )}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="no-scrollbar -mx-1 mb-3 flex items-center gap-2 overflow-x-auto px-1">
        {chip("atual", "Mês atual")}
        {chip("6m", "6 meses")}
        {chip("12m", "12 meses")}
        <select
          aria-label="Ano"
          value={range.startsWith("ano-") ? range.slice(4) : ""}
          onChange={(e) => e.target.value && setRange(`ano-${e.target.value}`)}
          className={cn(
            "shrink-0 rounded-full border bg-surface px-3 py-1.5 text-xs font-medium outline-none",
            range.startsWith("ano-") ? "border-brand/40 text-brand" : "border-line text-ink-2",
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
            responsive
            data={points}
            style={{ width: "100%", height: 220, cursor: "pointer" }}
            margin={{ top: 12, right: 8, bottom: 0, left: 4 }}
          >
            <defs>
              <linearGradient id="billFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLOR} stopOpacity={0.35} />
                <stop offset="100%" stopColor={COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgb(255 255 255 / 0.05)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--color-ink-3)", fontSize: 10 }}
              interval="preserveStartEnd"
              minTickGap={12}
            />
            <YAxis
              width={36}
              tickLine={false}
              axisLine={false}
              domain={[0, Math.ceil(max * 1.1)]}
              tick={{ fill: "var(--color-ink-3)", fontSize: 10 }}
              tickFormatter={axisShort}
            />
            <ReferenceLine
              y={target}
              stroke="var(--color-good)"
              strokeDasharray="4 4"
              label={{ value: `meta ${axisShort(target)}`, position: "insideTopRight", fill: "var(--color-good)", fontSize: 10 }}
            />
            <Tooltip
              cursor={{ stroke: "rgb(255 255 255 / 0.25)", strokeWidth: 1 }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as (typeof points)[number] | undefined;
                if (!active || !p) return null;
                return (
                  <div className="rounded-lg border border-line-strong bg-surface-2 px-3 py-2 text-xs shadow-xl">
                    <div className="text-ink-3">{range === "atual" ? `Fatura aberta até ${p.tooltip}` : p.tooltip}</div>
                    <div className="money font-medium text-ink">{brl(p.value)}</div>
                    <div className="text-ink-3">Toque para ver o resumo</div>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={COLOR}
            strokeWidth={2}
            fill="url(#billFill)"
            dot={range === "atual" ? false : { r: 4, fill: COLOR, stroke: "var(--color-surface)", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: COLOR, stroke: "var(--color-surface)", strokeWidth: 2 }}
            animationDuration={700}
          />
        </AreaChart>
        </div>
      )}
      <p className="mt-1 text-[11px] text-ink-3">
        {range === "atual"
          ? "Valor acumulado da fatura aberta, dia a dia. Toque no gráfico para ver os lançamentos."
          : "Total de cada fatura (a do mês atual é parcial). Toque num ponto para ver o resumo."}
      </p>

      <Sheet open={selected !== null} onClose={() => setSelected(null)} title={selected?.title ?? ""} subtitle={selected?.subtitle}>
        {selected && <PeriodSummary data={selected} />}
      </Sheet>
    </div>
  );
}

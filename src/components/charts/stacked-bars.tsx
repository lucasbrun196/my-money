"use client";

import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { axisShort, brl } from "@/lib/format";

export type StackSeries = { key: string; label: string; color: string };

/** Barras empilhadas (ex.: próximas faturas = parcelas + assinaturas + outros) com legenda. */
export function StackedBars({
  data,
  series,
  height = 200,
  onSelect,
}: {
  data: Record<string, number | string>[];
  series: StackSeries[];
  height?: number;
  /** Chamado com o índice da barra tocada. */
  onSelect?: (index: number) => void;
}) {
  return (
    <div>
      <BarChart
        responsive
        data={data}
        style={{ width: "100%", height, cursor: onSelect ? "pointer" : undefined }}
        margin={{ top: 8, right: 4, bottom: 0, left: 4 }}
        onClick={(state) => {
          const idx = state?.activeTooltipIndex;
          if (onSelect && idx != null) onSelect(Number(idx));
        }}
      >
        <CartesianGrid vertical={false} stroke="rgb(255 255 255 / 0.05)" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--color-ink-3)", fontSize: 11 }} />
        <YAxis
          width={36}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--color-ink-3)", fontSize: 10 }}
          tickFormatter={axisShort}
        />
        <Tooltip
          cursor={{ fill: "rgb(255 255 255 / 0.04)" }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const total = payload.reduce((s, p) => s + Number(p.value ?? 0), 0);
            return (
              <div className="rounded-lg border border-line-strong bg-surface-2 px-3 py-2 text-xs shadow-xl">
                <div className="mb-1 font-medium text-ink">{label}</div>
                {series.map((s) => {
                  const v = Number(payload.find((p) => p.dataKey === s.key)?.value ?? 0);
                  if (!v) return null;
                  return (
                    <div key={s.key} className="flex items-center justify-between gap-4 text-ink-2">
                      <span className="flex items-center gap-1.5">
                        <span className="size-2 rounded-sm" style={{ background: s.color }} />
                        {s.label}
                      </span>
                      <span className="money">{brl(v)}</span>
                    </div>
                  );
                })}
                <div className="mt-1 flex justify-between border-t border-line pt-1 font-medium text-ink">
                  <span>Total</span>
                  <span className="money">{brl(total)}</span>
                </div>
              </div>
            );
          }}
        />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            stackId="a"
            fill={s.color}
            stroke="var(--color-surface)"
            strokeWidth={i < series.length - 1 ? 1 : 0}
            radius={i === series.length - 1 ? [4, 4, 0, 0] : 0}
            maxBarSize={36}
            animationDuration={700}
          />
        ))}
      </BarChart>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

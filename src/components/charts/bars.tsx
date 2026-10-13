"use client";

import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { axisShort, brl } from "@/lib/format";

export type BarDatum = { key: string; label: string; value: number; tooltip?: string };

/** Barras de uma série (gastos por dia/mês) com tooltip. */
export function Bars({
  data,
  color = "#3987e5",
  height = 180,
  onSelect,
}: {
  data: BarDatum[];
  color?: string;
  height?: number;
  onSelect?: (key: string) => void;
}) {
  return (
    <BarChart
      responsive
      data={data}
      style={{ width: "100%", height, cursor: onSelect ? "pointer" : undefined }}
      margin={{ top: 8, right: 4, bottom: 0, left: 4 }}
      onClick={(state) => {
        const idx = state?.activeTooltipIndex;
        if (onSelect && idx != null) onSelect(data[Number(idx)]?.key);
      }}
    >
      <CartesianGrid vertical={false} stroke="rgb(255 255 255 / 0.05)" />
      <XAxis
        dataKey="label"
        tickLine={false}
        axisLine={false}
        tick={{ fill: "var(--color-ink-3)", fontSize: 10 }}
        interval="preserveStartEnd"
        minTickGap={6}
      />
      <YAxis
        width={36}
        tickLine={false}
        axisLine={false}
        tick={{ fill: "var(--color-ink-3)", fontSize: 10 }}
        tickFormatter={axisShort}
      />
      <Tooltip
        cursor={{ fill: "rgb(255 255 255 / 0.04)" }}
        content={({ active, payload }) => {
          const p = payload?.[0];
          if (!active || !p) return null;
          const d = p.payload as BarDatum;
          return (
            <div className="rounded-lg border border-line-strong bg-surface-2 px-3 py-2 text-xs shadow-xl">
              <div className="text-ink-3">{d.tooltip ?? d.label}</div>
              <div className="money font-medium text-ink">{brl(d.value)}</div>
            </div>
          );
        }}
      />
      <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={28} animationDuration={700} />
    </BarChart>
  );
}

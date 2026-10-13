"use client";

import type { ReactNode } from "react";
import { Pie, PieChart, Tooltip } from "recharts";
import { brl, pctShort } from "@/lib/format";

export type DonutDatum = { name: string; value: number; color: string };

/** Rosca com rótulo central e tooltip ao passar o dedo/mouse. */
export function Donut({
  data,
  center,
  size = 200,
}: {
  data: DonutDatum[];
  center?: ReactNode;
  size?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const chartData = data.map((d) => ({ ...d, fill: d.color }));

  return (
    <div className="relative mx-auto" style={{ width: "100%", maxWidth: size }}>
      <PieChart responsive style={{ width: "100%", aspectRatio: 1 }}>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          innerRadius="70%"
          outerRadius="100%"
          paddingAngle={data.length > 1 ? 2 : 0}
          cornerRadius={4}
          stroke="var(--color-surface)"
          strokeWidth={2}
          animationDuration={900}
          animationEasing="ease-out"
        />
        <Tooltip
          cursor={false}
          content={({ active, payload }) => {
            const p = payload?.[0];
            if (!active || !p) return null;
            const d = p.payload as DonutDatum;
            return (
              <div className="rounded-lg border border-line-strong bg-surface-2 px-3 py-2 text-xs shadow-xl">
                <div className="flex items-center gap-2 text-ink-2">
                  <span className="size-2 rounded-full" style={{ background: d.color }} />
                  {d.name}
                </div>
                <div className="money mt-0.5 font-medium text-ink">{brl(d.value)}</div>
                <div className="text-ink-3">{total > 0 ? pctShort(d.value / total) : "–"}</div>
              </div>
            );
          }}
        />
      </PieChart>
      {center && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {center}
        </div>
      )}
    </div>
  );
}

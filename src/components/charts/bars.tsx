"use client";

import { useId } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { axisShort, brl } from "@/lib/format";
import { AXIS_TICK, GRID_STROKE, TooltipBox } from "./tooltip";

export type BarDatum = { key: string; label: string; value: number; tooltip?: string };

/**
 * Barras de uma série (gastos por dia/mês). Mostra a linha da média e o
 * valor do pico, para o gráfico se explicar sem precisar do tooltip.
 */
export function Bars({
  data,
  color = "#3987e5",
  height = 180,
  average,
  averageLabel = "média",
  onSelect,
}: {
  data: BarDatum[];
  color?: string;
  height?: number;
  /** Desenha uma linha tracejada na média (ex.: média por dia). */
  average?: number;
  averageLabel?: string;
  onSelect?: (key: string) => void;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const peak = data.reduce((best, d, i) => (d.value > (data[best]?.value ?? -Infinity) ? i : best), 0);
  const hasPeak = (data[peak]?.value ?? 0) > 0;

  return (
    <BarChart
      responsive
      data={data}
      style={{ width: "100%", height, cursor: onSelect ? "pointer" : undefined }}
      margin={{ top: 18, right: 4, bottom: 0, left: 4 }}
      onClick={(state) => {
        const idx = state?.activeTooltipIndex;
        if (onSelect && idx != null) onSelect(data[Number(idx)]?.key);
      }}
    >
      <defs>
        <linearGradient id={`bar-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={1} />
          <stop offset="100%" stopColor={color} stopOpacity={0.35} />
        </linearGradient>
      </defs>
      <CartesianGrid vertical={false} stroke={GRID_STROKE} />
      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS_TICK} interval="preserveStartEnd" minTickGap={6} />
      <YAxis width={36} tickLine={false} axisLine={false} tick={AXIS_TICK} tickFormatter={axisShort} />
      <Tooltip
        cursor={{ fill: "rgb(255 248 230 / 0.04)", radius: 4 }}
        content={({ active, payload }) => {
          const p = payload?.[0];
          if (!active || !p) return null;
          const d = p.payload as BarDatum;
          const diff = average != null && average > 0 ? d.value / average - 1 : null;
          return (
            <TooltipBox title={d.tooltip ?? d.label}>
              <div className="money text-sm font-medium text-ink">{brl(d.value)}</div>
              {diff != null && d.value > 0 && (
                <div className="mt-0.5 text-ink-3">
                  {Math.abs(diff) < 0.05 ? "na média" : `${Math.round(Math.abs(diff) * 100)}% ${diff > 0 ? "acima" : "abaixo"} da ${averageLabel}`}
                </div>
              )}
              {onSelect && <div className="mt-1 text-[10px] text-ink-3">Toque para detalhar</div>}
            </TooltipBox>
          );
        }}
      />
      {average != null && average > 0 && (
        <ReferenceLine
          y={average}
          stroke="var(--color-ink-2)"
          strokeOpacity={0.5}
          strokeDasharray="3 4"
          ifOverflow="extendDomain"
          label={{
            value: `${averageLabel} ${axisShort(average)}`,
            position: "insideTopRight",
            fill: "var(--color-ink-2)",
            fontSize: 10,
            fontFamily: "var(--font-mono)",
          }}
        />
      )}
      <Bar
        dataKey="value"
        fill={`url(#bar-${id})`}
        radius={[3, 3, 0, 0]}
        maxBarSize={26}
        activeBar={{ fill: color }}
        animationDuration={900}
        animationEasing="ease-out"
      >
        {hasPeak && (
          <LabelList
            dataKey="value"
            content={({ x, y, width, index, value }) =>
              index === peak ? (
                <text
                  x={Number(x) + Number(width) / 2}
                  y={Number(y) - 6}
                  textAnchor="middle"
                  fill="var(--color-ink)"
                  fontSize={10}
                  fontFamily="var(--font-mono)"
                  className="money"
                >
                  {axisShort(Number(value))}
                </text>
              ) : null
            }
          />
        )}
      </Bar>
    </BarChart>
  );
}

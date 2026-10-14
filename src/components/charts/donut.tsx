"use client";

import { useState, type ReactNode } from "react";
import { Pie, PieChart, Sector } from "recharts";
import { brl, pctShort } from "@/lib/format";

export type DonutDatum = { name: string; value: number; color: string };

/**
 * Rosca interativa: ao passar o mouse (ou tocar) numa fatia, ela se destaca
 * e o centro passa a mostrar nome, valor e participação dela. O destaque
 * também pode ser controlado de fora (ex.: lista de categorias ao lado).
 */
export function Donut({
  data,
  center,
  size = 200,
  active,
  onActiveChange,
}: {
  data: DonutDatum[];
  center?: ReactNode;
  size?: number;
  active?: string | null;
  onActiveChange?: (name: string | null) => void;
}) {
  const [inner, setInner] = useState<string | null>(null);
  const current = active !== undefined ? active : inner;
  const set = (name: string | null) => {
    setInner(name);
    onActiveChange?.(name);
  };

  const total = data.reduce((s, d) => s + d.value, 0);
  const chartData = data.map((d) => ({ ...d, fill: d.color }));
  const focused = data.find((d) => d.name === current);

  return (
    <div className="relative mx-auto" style={{ width: "100%", maxWidth: size }} onMouseLeave={() => set(null)}>
      <PieChart responsive style={{ width: "100%", aspectRatio: 1 }}>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          innerRadius="72%"
          outerRadius="94%"
          paddingAngle={data.length > 1 ? 1.5 : 0}
          cornerRadius={3}
          stroke="none"
          startAngle={90}
          endAngle={-270}
          animationDuration={1100}
          animationEasing="ease-out"
          onMouseEnter={(d) => set(String(d.name))}
          onClick={(d) => set(current === String(d.name) ? null : String(d.name))}
          shape={(props) => {
            const on = props.name === current;
            return (
              <Sector
                {...props}
                outerRadius={on ? Number(props.outerRadius) + 6 : props.outerRadius}
                opacity={current && !on ? 0.35 : 1}
                style={{ transition: "opacity .25s ease", cursor: "pointer" }}
              />
            );
          }}
        />
      </PieChart>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-[18%] text-center">
        {focused ? (
          <div key={focused.name} className="animate-fade">
            <span className="line-clamp-2 text-[11px] leading-tight text-ink-2">{focused.name}</span>
            <span className="money mt-1 block text-sm font-semibold">{brl(focused.value)}</span>
            <span className="tnum font-mono text-[11px] text-ink-3">{total > 0 ? pctShort(focused.value / total) : "–"}</span>
          </div>
        ) : (
          center
        )}
      </div>
    </div>
  );
}

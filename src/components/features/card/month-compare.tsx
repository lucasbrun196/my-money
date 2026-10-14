"use client";

import { ArrowLeftRight } from "lucide-react";
import { useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS_TICK, GRID_STROKE, TooltipBox } from "@/components/charts/tooltip";
import { AnimatedBRL } from "@/components/ui/animated-number";
import { Delta } from "@/components/ui/delta";
import { compareBills, type BillCycle } from "@/domain/compare";
import type { ISODate } from "@/domain/types";
import { cn } from "@/lib/cn";
import { addDays, addMonths } from "@/lib/dates";
import { axisShort, brl, dateShort, monthLabel, monthLong, pctShort, signedBrl } from "@/lib/format";
import { Insight } from "../shared";

// Cores fixas por lado (A e B), validadas para daltonismo no fundo escuro.
const COLOR_A = "#3987e5";
const COLOR_B = "#d95926";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const longName = (b: BillCycle) => `fatura de ${monthLong(b.ref)}`;

/**
 * Comparação entre duas faturas quaisquer: total cobrado (ou parcial, se
 * aberta) e gasto acumulado por dia do ciclo.
 */
export function MonthCompare({ bills, today }: { bills: BillCycle[]; today: ISODate }) {
  const open = bills.find((b) => b.open) ?? bills[0];
  const previous = bills.find((b) => b.ref === addMonths(open.ref, -1));
  const lastYear = bills.find((b) => b.ref === addMonths(open.ref, -12));

  const [aKey, setA] = useState(open.key);
  const [bKey, setB] = useState((previous ?? bills[1] ?? open).key);
  const a = bills.find((x) => x.key === aKey) ?? open;
  const b = bills.find((x) => x.key === bKey) ?? open;

  const c = compareBills(a, b, today);
  const refA = c.sameDay ? c.sameDay.a : a.total;
  const refB = c.sameDay ? c.sameDay.b : b.total;
  const diff = Math.round((refA - refB) * 100) / 100;
  const pct = refB > 0 ? diff / refB : null;
  const same = a.key === b.key;

  const length = Math.max(c.a.cumulative.length, c.b.cumulative.length);
  const points = Array.from({ length }, (_, i) => ({
    day: i + 1,
    a: c.a.cumulative[i] ?? null,
    b: c.b.cumulative[i] ?? null,
  }));

  const preset = (label: string, target?: BillCycle) => {
    const on = target != null && a.key === open.key && b.key === target.key;
    return (
      <button
        type="button"
        disabled={!target}
        onClick={() => {
          if (!target) return;
          setA(open.key);
          setB(target.key);
        }}
        title={target ? undefined : "Sem essa fatura no Open Finance (o histórico vai até 12 meses)"}
        className={cn(
          "shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all duration-200 active:scale-95",
          on ? "border-ink bg-ink text-bg" : "border-line-strong text-ink-2 hover:border-ink-3 hover:text-ink",
          !target && "cursor-not-allowed opacity-35",
        )}
      >
        {label}
      </button>
    );
  };

  const variation =
    pct != null && Math.abs(diff) >= 0.005 ? (
      <>
        {" "}
        (<span className={diff > 0 ? "text-neg" : "text-pos"}>
          {pctShort(Math.abs(pct))} {diff > 0 ? "a mais" : "a menos"}
        </span>
        )
      </>
    ) : null;

  return (
    <div className="space-y-6">
      {/* Seletores */}
      <div className="flex flex-wrap items-center gap-2">
        <BillSelect value={a.key} onChange={setA} bills={bills} color={COLOR_A} label="Fatura A" />
        <button
          type="button"
          onClick={() => {
            setA(b.key);
            setB(a.key);
          }}
          aria-label="Inverter as faturas"
          className="group grid size-9 place-items-center rounded-md border border-line-strong text-ink-2 transition-colors hover:text-ink"
        >
          <ArrowLeftRight className="size-4 transition-transform duration-500 ease-out-expo group-active:rotate-180" />
        </button>
        <BillSelect value={b.key} onChange={setB} bills={bills} color={COLOR_B} label="Fatura B" />
        <div className="no-scrollbar -mx-1 flex w-full gap-1.5 overflow-x-auto px-1 sm:ml-auto sm:w-auto">
          {preset("Atual × anterior", previous)}
          {preset("Atual × ano passado", lastYear)}
        </div>
      </div>

      {/* Totais */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-[1fr_1fr_auto]">
        <Total bill={a} color={COLOR_A} />
        <Total bill={b} color={COLOR_B} />
        <div className="col-span-2 sm:col-span-1 sm:text-right">
          <p className="eyebrow">{c.sameDay ? `Diferença até o ${c.sameDay.day}º dia` : "Diferença"}</p>
          <div className="mt-2">
            {same ? (
              <span className="text-sm text-ink-3">Mesma fatura</span>
            ) : Math.abs(diff) < 0.005 ? (
              <span className="text-sm text-ink-2">Igual</span>
            ) : (
              <Delta value={diff} pct={pct} invert />
            )}
          </div>
        </div>
      </div>

      {!same && (
        <Insight tone={diff > 0 ? "warning" : "good"}>
          {c.sameDay ? (
            <>
              Até o {c.sameDay.day}º dia do ciclo, a {longName(a)} soma <span className="money text-ink">{brl(refA)}</span>, contra{" "}
              <span className="money text-ink">{brl(refB)}</span> no mesmo ponto da {longName(b)}
              {variation}.{" "}
              {!b.open && (
                <>
                  A {longName(b)} fechou em <span className="money text-ink">{brl(b.total)}</span>.
                </>
              )}
              {!a.open && (
                <>
                  A {longName(a)} fechou em <span className="money text-ink">{brl(a.total)}</span>.
                </>
              )}
            </>
          ) : (
            <>
              A {longName(a)} fechou em <span className="money text-ink">{brl(refA)}</span>, contra{" "}
              <span className="money text-ink">{brl(refB)}</span> da {longName(b)}
              {variation}.
            </>
          )}
        </Insight>
      )}

      {/* Acumulado por dia do ciclo */}
      <div>
        <p className="eyebrow mb-2">Gasto acumulado ao longo do ciclo da fatura</p>
        <LineChart
          key={`${a.key}-${b.key}`}
          responsive
          data={points}
          style={{ width: "100%", height: 230 }}
          margin={{ top: 12, right: 8, bottom: 0, left: 4 }}
        >
          <CartesianGrid vertical={false} stroke={GRID_STROKE} />
          <XAxis dataKey="day" tickLine={false} axisLine={false} tick={AXIS_TICK} interval="preserveStartEnd" minTickGap={10} />
          <YAxis width={36} tickLine={false} axisLine={false} tick={AXIS_TICK} tickFormatter={axisShort} />
          {c.sameDay && (
            <ReferenceLine
              x={c.sameDay.day}
              stroke="var(--color-ink-2)"
              strokeOpacity={0.5}
              strokeDasharray="2 4"
              label={{ value: "hoje", position: "insideTopLeft", fill: "var(--color-ink-2)", fontSize: 10, fontFamily: "var(--font-mono)" }}
            />
          )}
          <Tooltip
            cursor={{ stroke: "rgb(255 248 230 / 0.25)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as (typeof points)[number] | undefined;
              if (!active || !p) return null;
              const d = p.a != null && p.b != null ? p.a - p.b : null;
              return (
                <TooltipBox title={`${p.day}º dia do ciclo`}>
                  <TipRow color={COLOR_A} label={dayLabel(a, p.day)} value={p.a} />
                  <TipRow color={COLOR_B} label={dayLabel(b, p.day)} value={p.b} />
                  {d != null && !same && (
                    <div className={cn("mt-1 border-t border-line pt-1", d > 0 ? "text-neg" : d < 0 ? "text-pos" : "text-ink-3")}>
                      <span className="money">{signedBrl(d)}</span>
                    </div>
                  )}
                </TooltipBox>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="b"
            stroke={COLOR_B}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: COLOR_B, stroke: "var(--color-surface)", strokeWidth: 2 }}
            connectNulls={false}
            animationDuration={900}
          />
          <Line
            type="monotone"
            dataKey="a"
            stroke={COLOR_A}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, fill: COLOR_A, stroke: "var(--color-surface)", strokeWidth: 2 }}
            connectNulls={false}
            animationDuration={1100}
          />
        </LineChart>
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-ink-3">
          <Legend color={COLOR_A} bill={a} />
          <Legend color={COLOR_B} bill={b} />
        </ul>
        <p className="mt-1 text-[11px] text-ink-3">
          O ciclo vai do dia seguinte ao fechamento anterior até o fechamento. O total das faturas fechadas é o valor cobrado
          pelo banco.
        </p>
        {[a, ...(same ? [] : [b])].map((bill) => {
          const sum = bill.perDay.reduce((x, y) => x + y, 0);
          if (bill.open || Math.abs(sum - bill.total) <= 0.05) return null;
          return (
            <p key={bill.key} className="mt-1 text-[11px] text-warning">
              Na {longName(bill)}, os lançamentos somam {brl(sum)} e o banco cobrou {brl(bill.total)}: a diferença são parcelas de
              compras anteriores ao histórico de 12 meses, juros ou encargos. Por isso a linha termina abaixo do total.
            </p>
          );
        })}
      </div>
    </div>
  );
}

/** "Fatura A, dia N" → data real daquele dia no ciclo (ex.: "Ago/2026 · 08/08"). */
function dayLabel(bill: BillCycle, day: number) {
  return `${cap(monthLabel(bill.ref))} · ${dateShort(addDays(bill.start, day - 1))}`;
}

function BillSelect({
  value,
  onChange,
  bills,
  color,
  label,
}: {
  value: string;
  onChange: (key: string) => void;
  bills: BillCycle[];
  color: string;
  label: string;
}) {
  return (
    <label className="relative flex min-w-0 flex-1 items-center sm:flex-none">
      <span className="sr-only">{label}</span>
      <span aria-hidden className="pointer-events-none absolute left-3 size-2 rounded-full" style={{ background: color }} />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-md border border-line-strong bg-surface-2 py-2 pr-8 pl-7 text-sm font-medium text-ink outline-none transition-colors hover:border-ink-3 focus:border-ink-2 sm:w-48"
      >
        {bills.map((b) => (
          <option key={b.key} value={b.key}>
            {cap(monthLabel(b.ref))}
            {b.open ? " (aberta)" : ""}
          </option>
        ))}
      </select>
      <span aria-hidden className="pointer-events-none absolute right-3 text-[10px] text-ink-3">
        ▼
      </span>
    </label>
  );
}

function Total({ bill, color }: { bill: BillCycle; color: string }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-xs text-ink-3">
        <span className="size-2 shrink-0 rounded-full" style={{ background: color }} />
        <span className="truncate">{cap(longName(bill))}</span>
      </p>
      <AnimatedBRL value={bill.total} className="mt-1 text-[26px] font-semibold tracking-[-0.03em] sm:text-[30px]" />
      <p className="text-[11px] text-ink-3">
        {bill.open ? `aberta · fecha ${dateShort(bill.close)}` : `fechou ${dateShort(bill.close)} · venceu ${dateShort(bill.due)}`}
        {` · ${bill.count} ${bill.count === 1 ? "compra" : "compras"}`}
      </p>
    </div>
  );
}

function Legend({ color, bill }: { color: string; bill: BillCycle }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className="h-0.5 w-4 rounded-full" style={{ background: color }} />
      {cap(longName(bill))} ({dateShort(bill.start)} a {dateShort(bill.close)})
    </li>
  );
}

function TipRow({ color, label, value }: { color: string; label: string; value: number | null }) {
  return (
    <div className="flex items-center justify-between gap-4 text-ink-2">
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <span className="money text-ink">{value != null ? brl(value) : "—"}</span>
    </div>
  );
}

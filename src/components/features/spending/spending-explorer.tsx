"use client";

import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, CreditCard, Landmark, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Bars } from "@/components/charts/bars";
import { Donut } from "@/components/charts/donut";
import { AnimatedBRL } from "@/components/ui/animated-number";
import { Sheet } from "@/components/ui/sheet";
import { PeriodSummary, type SummaryData } from "../period-summary";
import { buckets, periodRange, previousComparable, shiftAnchor, type PeriodKind } from "@/domain/periods";
import { totalsByCategory, type Expense } from "@/domain/spending";
import type { ISODate } from "@/domain/types";
import { diffDays } from "@/lib/dates";
import { SERIES, SERIES_OTHER } from "@/lib/colors";
import { brl, dateWithWeekday, monthLong, pctShort } from "@/lib/format";
import { cn } from "@/lib/cn";

const KINDS: { id: PeriodKind; label: string; noun: string }[] = [
  { id: "dia", label: "Dia", noun: "dia" },
  { id: "semana", label: "Semana", noun: "semana" },
  { id: "mes", label: "Mês", noun: "mês" },
  { id: "ano", label: "Ano", noun: "ano" },
];

type SourceFilter = "todos" | "conta" | "cartao";
const PAGE = 40;

export function SpendingExplorer({ expenses, today }: { expenses: Expense[]; today: ISODate }) {
  const [kind, setKind] = useState<PeriodKind>("mes");
  const [anchor, setAnchor] = useState<ISODate>(today);
  const [source, setSource] = useState<SourceFilter>("todos");
  const [onlyVariable, setOnlyVariable] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE);

  // Cor por categoria fixada pelo ranking do ano inteiro: a cor não muda ao trocar de período.
  const colorOf = useMemo(() => {
    const ranked = totalsByCategory(expenses).map((c) => c.category);
    const map = new Map(ranked.slice(0, SERIES.length).map((c, i) => [c, SERIES[i]]));
    return (cat: string) => map.get(cat) ?? SERIES_OTHER;
  }, [expenses]);

  const range = useMemo(() => periodRange(kind, anchor), [kind, anchor]);
  const canGoNext = shiftAnchor(kind, anchor, 1) <= today && range.end < today;
  const kindInfo = KINDS.find((k) => k.id === kind)!;

  const inPeriod = useMemo(
    () =>
      expenses.filter(
        (e) =>
          e.date >= range.start &&
          e.date <= range.end &&
          (source === "todos" || e.source === source) &&
          (!onlyVariable || e.variable),
      ),
    [expenses, range, source, onlyVariable],
  );

  const byCategory = useMemo(() => totalsByCategory(inPeriod), [inPeriod]);
  const filtered = useMemo(
    () => (category ? inPeriod.filter((e) => e.category === category) : inPeriod),
    [inPeriod, category],
  );
  const total = filtered.reduce((s, e) => s + e.amount, 0);
  const periodTotal = inPeriod.reduce((s, e) => s + e.amount, 0);
  const daysElapsed = Math.max(diffDays(range.start, range.end < today ? range.end : today) + 1, 1);

  // Comparação com o período anterior equivalente (mesmos filtros e mesmo ponto do período).
  const prev = previousComparable(kind, anchor, today);
  const prevTotal = expenses
    .filter(
      (e) =>
        e.date >= prev.start &&
        e.date <= prev.end &&
        (source === "todos" || e.source === source) &&
        (!onlyVariable || e.variable) &&
        (!category || e.category === category),
    )
    .reduce((s, e) => s + e.amount, 0);
  // Só compara quando o histórico cobre o período anterior inteiro (senão o % engana).
  const dataStart = expenses.reduce<ISODate | null>((min, e) => (min == null || e.date < min ? e.date : min), null);
  const change = prevTotal > 0 && dataStart != null && dataStart <= prev.start ? total / prevTotal - 1 : null;

  const periodBuckets = useMemo(() => buckets(range), [range]);
  const bars = useMemo(() => {
    if (kind === "dia") return [];
    return periodBuckets.map((b) => ({
      key: b.key,
      label: b.label,
      tooltip: kind === "ano" ? monthLong(b.key) : dateWithWeekday(b.start),
      value: Math.round(filtered.filter((e) => e.date >= b.start && e.date <= b.end).reduce((s, e) => s + e.amount, 0) * 100) / 100,
    }));
  }, [kind, periodBuckets, filtered]);
  const elapsedBuckets = Math.max(periodBuckets.filter((b) => b.start <= today).length, 1);
  const average = kind === "dia" ? undefined : total / elapsedBuckets;

  // Rosca: até 8 categorias nomeadas, o resto vira "Outros".
  const donutData = useMemo(() => {
    const named = byCategory.filter((c) => colorOf(c.category) !== SERIES_OTHER);
    const rest = byCategory.filter((c) => colorOf(c.category) === SERIES_OTHER);
    const data = named.map((c) => ({ name: c.category, value: c.total, color: colorOf(c.category) }));
    const restTotal = rest.reduce((s, c) => s + c.total, 0);
    if (restTotal > 0) data.push({ name: "Outros", value: restTotal, color: SERIES_OTHER });
    return data;
  }, [byCategory, colorOf]);

  const grouped = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of filtered.slice(0, visible)) map.set(e.date, [...(map.get(e.date) ?? []), e]);
    return [...map.entries()];
  }, [filtered, visible]);

  const go = (dir: -1 | 1) => {
    setAnchor(shiftAnchor(kind, anchor, dir));
    setVisible(PAGE);
  };

  // Resumo da barra tocada (mês no modo Ano; dia nos modos Mês/Semana).
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const summary = useMemo<SummaryData | null>(() => {
    if (!selectedBucket) return null;
    const b = periodBuckets.find((x) => x.key === selectedBucket);
    if (!b) return null;
    const items = filtered.filter((e) => e.date >= b.start && e.date <= b.end);
    const filters = [
      source === "conta" ? "só conta" : source === "cartao" ? "só cartão" : null,
      onlyVariable ? "só variáveis" : null,
      category,
    ].filter(Boolean);
    return {
      title: kind === "ano" ? monthLong(b.key) : dateWithWeekday(b.start),
      subtitle: filters.length ? `Filtros: ${filters.join(" · ")}` : "Conta + cartão",
      items: items.map((e) => ({
        id: e.id,
        description: e.description,
        amount: e.amount,
        category: e.category,
        date: e.date,
        label: e.installment ? `${e.installment.number}/${e.installment.total}` : undefined,
        fixed: Boolean(e.fixedId),
      })),
    };
  }, [selectedBucket, periodBuckets, filtered, kind, source, onlyVariable, category]);

  const kindIndex = KINDS.findIndex((k) => k.id === kind);
  const topCategory = byCategory[0];

  return (
    <div className="stagger space-y-3 sm:space-y-4">
      {/* Filtros */}
      <div className="panel space-y-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative grid w-full grid-cols-4 rounded-lg bg-surface-2 p-1 sm:w-80" role="tablist" aria-label="Período">
            <span
              aria-hidden
              className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/4)] rounded-md border border-line-strong bg-surface-3 transition-transform duration-500 ease-out-expo"
              style={{ transform: `translateX(${kindIndex * 100}%)` }}
            />
            {KINDS.map((k) => (
              <button
                key={k.id}
                role="tab"
                aria-selected={kind === k.id}
                onClick={() => {
                  setKind(k.id);
                  setAnchor(today);
                  setVisible(PAGE);
                }}
                className={cn(
                  "relative rounded-md py-1.5 text-[13px] font-medium transition-colors duration-300",
                  kind === k.id ? "text-ink" : "text-ink-3 hover:text-ink-2",
                )}
              >
                {k.label}
              </button>
            ))}
          </div>

          <div className="flex w-full items-center justify-between gap-1 sm:w-auto">
            <button onClick={() => go(-1)} aria-label="Período anterior" className="grid size-8 place-items-center rounded-md text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
              <ChevronLeft className="size-4" />
            </button>
            <span key={range.label} className="min-w-36 animate-fade text-center text-sm font-medium capitalize">
              {range.label}
            </span>
            <button
              onClick={() => go(1)}
              disabled={!canGoNext}
              aria-label="Próximo período"
              className="grid size-8 place-items-center rounded-md text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-25 disabled:hover:bg-transparent"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
          {(["todos", "conta", "cartao"] as const).map((s) => (
            <FilterChip key={s} on={source === s} onClick={() => setSource(s)}>
              {s === "todos" ? "Conta + cartão" : s === "conta" ? "Só conta" : "Só cartão"}
            </FilterChip>
          ))}
          <span aria-hidden className="mx-1 my-1.5 w-px shrink-0 bg-line-strong" />
          <FilterChip on={onlyVariable} onClick={() => setOnlyVariable((v) => !v)} pressed>
            Só variáveis
          </FilterChip>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-3 sm:gap-4 lg:grid-cols-3">
        {/* Total + barras */}
        <section className="panel p-4 sm:p-5 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
            <div>
              <p className="eyebrow">{category ? `Gastos em ${category}` : "Total gasto"}</p>
              <AnimatedBRL value={total} className="mt-1.5 text-[36px] font-semibold tracking-[-0.03em]" />
              {change != null && Math.abs(change) >= 0.005 && (
                <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-3">
                  <span className={cn("inline-flex items-center gap-0.5 font-medium", change > 0 ? "text-neg" : "text-pos")}>
                    {change > 0 ? <ArrowUpRight className="size-3.5" aria-hidden /> : <ArrowDownRight className="size-3.5" aria-hidden />}
                    {change > 0 ? "+" : "−"}
                    {pctShort(Math.abs(change))}
                  </span>
                  {prev.partial ? `que no mesmo ponto do ${kindInfo.noun} anterior` : kind === "dia" ? "que no dia anterior" : `que no ${kindInfo.noun} anterior`}
                  <span className="money">({brl(prevTotal)})</span>
                </p>
              )}
              {category && (
                <button
                  onClick={() => setCategory(null)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-line-strong px-2 py-1 text-xs text-ink-2 transition-colors hover:text-ink"
                >
                  <span className="size-2 rounded-[2px]" style={{ background: colorOf(category) }} />
                  {category}
                  <X className="size-3" aria-label="Limpar filtro de categoria" />
                </button>
              )}
            </div>
            <dl className="flex gap-6 text-right">
              <Stat label="Transações" value={String(filtered.length)} />
              {kind !== "dia" && <Stat label={kind === "ano" ? "Média/mês" : "Média/dia"} value={brl(kind === "ano" ? total / elapsedBuckets : total / daysElapsed)} money />}
            </dl>
          </div>

          {bars.length > 0 && (
            <div className="mt-6">
              <Bars
                key={`${kind}-${range.start}-${category ?? ""}`}
                data={bars}
                color={category ? colorOf(category) : "#3987e5"}
                height={210}
                average={average}
                averageLabel={kind === "ano" ? "média/mês" : "média/dia"}
                onSelect={setSelectedBucket}
              />
              <p className="mt-2 text-[11px] text-ink-3">
                Linha tracejada: média {kind === "ano" ? "mensal" : "diária"} até hoje. O número no topo marca o maior gasto.
                Toque numa barra para ver o {kind === "ano" ? "mês" : "dia"}.
              </p>
            </div>
          )}
          <Sheet open={summary !== null} onClose={() => setSelectedBucket(null)} title={summary?.title ?? ""} subtitle={summary?.subtitle}>
            {summary && (
              <PeriodSummary
                data={summary}
                action={
                  kind === "ano" && selectedBucket ? (
                    <button
                      type="button"
                      onClick={() => {
                        setKind("mes");
                        setAnchor(`${selectedBucket}-01`);
                        setVisible(PAGE);
                        setSelectedBucket(null);
                      }}
                      className="w-full rounded-lg bg-ink py-3 text-sm font-medium text-bg transition hover:opacity-90 active:scale-[0.99]"
                    >
                      Abrir o mês completo
                    </button>
                  ) : undefined
                }
              />
            )}
          </Sheet>
        </section>

        {/* Categorias */}
        <section className="panel p-4 sm:p-5">
          <h2 className="text-[13px] font-medium">Por categoria</h2>
          <p className="mt-0.5 text-xs text-ink-3">Toque numa categoria para filtrar</p>
          {donutData.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-3">Nenhum gasto no período.</p>
          ) : (
            <>
              <div className="mt-4">
                <Donut
                  data={donutData}
                  size={180}
                  active={hovered}
                  onActiveChange={setHovered}
                  center={
                    <>
                      <span className="eyebrow">no período</span>
                      <span className="money mt-1 text-sm font-semibold">{brl(periodTotal)}</span>
                    </>
                  }
                />
              </div>
              {topCategory && byCategory.length > 1 && (
                <p className="mt-4 text-xs text-ink-3">
                  <span className="text-ink-2">{topCategory.category}</span> lidera, com{" "}
                  {pctShort(periodTotal ? topCategory.total / periodTotal : 0)} dos gastos.
                </p>
              )}
              <ul className="thin-scroll mt-3 max-h-80 space-y-0.5 overflow-y-auto" onMouseLeave={() => setHovered(null)}>
                {byCategory.map((c) => {
                  const share = periodTotal ? c.total / periodTotal : 0;
                  const name = colorOf(c.category) === SERIES_OTHER ? "Outros" : c.category;
                  const on = category === c.category;
                  return (
                    <li key={c.category}>
                      <button
                        onClick={() => setCategory(on ? null : c.category)}
                        onMouseEnter={() => setHovered(name)}
                        aria-pressed={on}
                        className={cn(
                          "w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                          on ? "bg-surface-3" : "hover:bg-surface-2",
                        )}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="size-2 shrink-0 rounded-[2px]" style={{ background: colorOf(c.category) }} />
                            <span className="truncate text-ink-2">{c.category}</span>
                          </span>
                          <span className="flex shrink-0 items-baseline gap-2">
                            <span className="money text-ink">{brl(c.total)}</span>
                            <span className="tnum w-10 text-right font-mono text-[11px] text-ink-3">{pctShort(share)}</span>
                          </span>
                        </span>
                        <span className="mt-1.5 block h-0.5 overflow-hidden rounded-full bg-surface-3">
                          <span
                            className="block h-full rounded-full transition-[width] duration-700 ease-out-expo starting:w-0"
                            style={{ width: `${share * 100}%`, background: colorOf(c.category) }}
                          />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      </div>

      {/* Lista de transações agrupada por dia */}
      <section className="panel p-2 sm:p-3">
        <h2 className="px-2 pt-2 text-[13px] font-medium">Lançamentos</h2>
        {grouped.length === 0 && <p className="py-10 text-center text-sm text-ink-3">Nada por aqui neste período.</p>}
        {grouped.map(([date, items]) => (
          <div key={date} className="mb-1">
            <div className="sticky top-14 z-10 flex items-center justify-between bg-surface/95 px-2 pt-4 pb-1.5 lg:top-0">
              <span className="eyebrow">{dateWithWeekday(date)}</span>
              <span className="money font-mono text-[11px] text-ink-3">{brl(items.reduce((s, e) => s + e.amount, 0))}</span>
            </div>
            <ul>
              {items.map((e) => (
                <li key={e.id} className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-surface-2">
                  <span
                    className="relative grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-surface-2 text-ink-2"
                    title={e.source === "cartao" ? "Cartão de crédito" : "Conta corrente"}
                  >
                    {e.source === "cartao" ? <CreditCard className="size-4" strokeWidth={1.7} /> : <Landmark className="size-4" strokeWidth={1.7} />}
                    <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-surface" style={{ background: colorOf(e.category) }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{e.description}</p>
                    <p className="truncate text-xs text-ink-3">
                      {e.category}
                      {e.installment && ` · parcela ${e.installment.number}/${e.installment.total}`}
                      {e.fixedId && " · fixo"}
                      {e.pending && " · pendente"}
                    </p>
                  </div>
                  <span className="money shrink-0 text-sm font-medium">{brl(e.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {filtered.length > visible && (
          <button
            onClick={() => setVisible((v) => v + PAGE)}
            className="mt-1 w-full rounded-lg border border-line py-3 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            Mostrar mais ({filtered.length - visible})
          </button>
        )}
      </section>
    </div>
  );
}

function FilterChip({
  on,
  onClick,
  pressed = false,
  children,
}: {
  on: boolean;
  onClick: () => void;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={pressed ? on : undefined}
      className={cn(
        "shrink-0 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all duration-200 active:scale-95",
        on ? "border-ink bg-ink text-bg" : "border-line-strong text-ink-2 hover:border-ink-3 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function Stat({ label, value, money = false }: { label: string; value: string; money?: boolean }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className={cn("tnum mt-1 text-base font-medium", money && "money")}>{value}</dd>
    </div>
  );
}

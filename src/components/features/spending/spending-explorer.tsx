"use client";

import { ChevronLeft, ChevronRight, CreditCard, Landmark, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Bars } from "@/components/charts/bars";
import { Donut } from "@/components/charts/donut";
import { Sheet } from "@/components/ui/sheet";
import { PeriodSummary, type SummaryData } from "../period-summary";
import { buckets, periodRange, shiftAnchor, type PeriodKind } from "@/domain/periods";
import { totalsByCategory, type Expense } from "@/domain/spending";
import type { ISODate } from "@/domain/types";
import { diffDays } from "@/lib/dates";
import { SERIES, SERIES_OTHER } from "@/lib/colors";
import { brl, dateWithWeekday, monthLong, pctShort } from "@/lib/format";
import { cn } from "@/lib/cn";

const KINDS: { id: PeriodKind; label: string }[] = [
  { id: "dia", label: "Dia" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mês" },
  { id: "ano", label: "Ano" },
];

type SourceFilter = "todos" | "conta" | "cartao";
const PAGE = 40;

export function SpendingExplorer({ expenses, today }: { expenses: Expense[]; today: ISODate }) {
  const [kind, setKind] = useState<PeriodKind>("mes");
  const [anchor, setAnchor] = useState<ISODate>(today);
  const [source, setSource] = useState<SourceFilter>("todos");
  const [onlyVariable, setOnlyVariable] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE);

  // Cor por categoria fixada pelo ranking do ano inteiro: a cor não muda ao trocar de período.
  const colorOf = useMemo(() => {
    const ranked = totalsByCategory(expenses).map((c) => c.category);
    const map = new Map(ranked.slice(0, SERIES.length).map((c, i) => [c, SERIES[i]]));
    return (cat: string) => map.get(cat) ?? SERIES_OTHER;
  }, [expenses]);

  const range = useMemo(() => periodRange(kind, anchor), [kind, anchor]);
  const canGoNext = shiftAnchor(kind, anchor, 1) <= today && range.end < today;

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

  const bars = useMemo(() => {
    if (kind === "dia") return [];
    return buckets(range).map((b) => ({
      key: b.key,
      label: b.label,
      tooltip: kind === "ano" ? b.label : dateWithWeekday(b.start),
      value: Math.round(filtered.filter((e) => e.date >= b.start && e.date <= b.end).reduce((s, e) => s + e.amount, 0) * 100) / 100,
    }));
  }, [kind, range, filtered]);

  // Donut: até 8 categorias nomeadas, o resto vira "Outros".
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
    const b = buckets(range).find((x) => x.key === selectedBucket);
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
  }, [selectedBucket, range, filtered, kind, source, onlyVariable, category]);

  return (
    <div className="space-y-4">
      {/* Filtros: uma linha acima de tudo */}
      <div className="animate-fade-up space-y-3 rounded-2xl border border-line bg-surface/80 p-3 sm:p-4">
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-surface-2 p-1" role="tablist" aria-label="Período">
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
                "rounded-lg py-2 text-sm font-medium transition-all",
                kind === k.id ? "bg-surface-3 text-ink shadow" : "text-ink-3 hover:text-ink-2",
              )}
            >
              {k.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button onClick={() => go(-1)} aria-label="Período anterior" className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-surface-2">
            <ChevronLeft className="size-5" />
          </button>
          <span className="text-sm font-medium capitalize">{range.label}</span>
          <button
            onClick={() => go(1)}
            disabled={!canGoNext}
            aria-label="Próximo período"
            className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-surface-2 disabled:opacity-30"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          {(["todos", "conta", "cartao"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSource(s)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                source === s ? "border-brand/40 bg-brand/10 text-brand" : "border-line text-ink-2 hover:border-line-strong",
              )}
            >
              {s === "todos" ? "Conta + cartão" : s === "conta" ? "Só conta" : "Só cartão"}
            </button>
          ))}
          <button
            onClick={() => setOnlyVariable((v) => !v)}
            aria-pressed={onlyVariable}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              onlyVariable ? "border-brand/40 bg-brand/10 text-brand" : "border-line text-ink-2 hover:border-line-strong",
            )}
          >
            Só variáveis
          </button>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-3">
        {/* Resumo + barras */}
        <section className="animate-fade-up rounded-2xl border border-line bg-surface/80 p-4 sm:p-5 lg:col-span-2" style={{ animationDelay: "60ms" }}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs text-ink-3">{category ? `Gastos em ${category}` : "Total gasto"}</p>
              <p className="money text-3xl font-semibold tracking-tight">{brl(total)}</p>
            </div>
            <div className="flex gap-5 text-right text-xs text-ink-3">
              <div>
                <p>Transações</p>
                <p className="text-sm font-medium text-ink">{filtered.length}</p>
              </div>
              {kind !== "dia" && (
                <div>
                  <p>Média/dia</p>
                  <p className="money text-sm font-medium text-ink">{brl(total / daysElapsed)}</p>
                </div>
              )}
            </div>
          </div>
          {category && (
            <button onClick={() => setCategory(null)} className="mt-2 inline-flex items-center gap-1 rounded-full bg-surface-3 px-2.5 py-1 text-xs text-ink-2 hover:text-ink">
              <span className="size-2 rounded-full" style={{ background: colorOf(category) }} />
              {category}
              <X className="size-3" aria-label="Limpar filtro de categoria" />
            </button>
          )}
          {bars.length > 0 && (
            <div className="mt-4">
              <Bars data={bars} color={category ? colorOf(category) : "#3987e5"} height={190} onSelect={setSelectedBucket} />
              <p className="mt-1 text-[11px] text-ink-3">
                Toque numa barra para ver o resumo do {kind === "ano" ? "mês" : "dia"}.
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
                      className="w-full rounded-xl bg-brand/10 py-3 text-sm font-medium text-brand hover:bg-brand/15"
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
        <section className="animate-fade-up rounded-2xl border border-line bg-surface/80 p-4 sm:p-5" style={{ animationDelay: "120ms" }}>
          <h2 className="mb-3 text-sm font-medium text-ink-2">Por categoria</h2>
          {donutData.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-3">Nenhum gasto no período.</p>
          ) : (
            <>
              <Donut
                data={donutData}
                size={170}
                center={
                  <>
                    <span className="text-[11px] text-ink-3">no período</span>
                    <span className="money text-sm font-semibold">{brl(periodTotal)}</span>
                  </>
                }
              />
              <ul className="mt-4 space-y-1">
                {byCategory.map((c) => (
                  <li key={c.category}>
                    <button
                      onClick={() => setCategory(category === c.category ? null : c.category)}
                      aria-pressed={category === c.category}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                        category === c.category ? "bg-surface-3" : "hover:bg-surface-2",
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="size-2.5 shrink-0 rounded-sm" style={{ background: colorOf(c.category) }} />
                        <span className="truncate text-ink-2">{c.category}</span>
                      </span>
                      <span className="flex shrink-0 items-baseline gap-2">
                        <span className="money text-ink">{brl(c.total)}</span>
                        <span className="w-10 text-right text-xs text-ink-3">{pctShort(periodTotal ? c.total / periodTotal : 0)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      {/* Lista de transações agrupada por dia */}
      <section className="animate-fade-up rounded-2xl border border-line bg-surface/80 p-2 sm:p-3" style={{ animationDelay: "180ms" }}>
        {grouped.length === 0 && <p className="py-10 text-center text-sm text-ink-3">Nada por aqui neste período.</p>}
        {grouped.map(([date, items]) => (
          <div key={date} className="mb-1">
            <div className="flex items-center justify-between px-2 pt-3 pb-1 text-xs text-ink-3">
              <span className="capitalize">{dateWithWeekday(date)}</span>
              <span className="money">{brl(items.reduce((s, e) => s + e.amount, 0))}</span>
            </div>
            <ul>
              {items.map((e) => (
                <li key={e.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-surface-2">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-3 text-ink-2" title={e.source === "cartao" ? "Cartão de crédito" : "Conta corrente"}>
                    {e.source === "cartao" ? <CreditCard className="size-4" /> : <Landmark className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{e.description}</p>
                    <p className="flex items-center gap-1.5 truncate text-xs text-ink-3">
                      <span className="size-1.5 shrink-0 rounded-full" style={{ background: colorOf(e.category) }} />
                      {e.category}
                      {e.installment && ` · ${e.installment.number}/${e.installment.total}`}
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
          <button onClick={() => setVisible((v) => v + PAGE)} className="w-full rounded-xl py-3 text-sm font-medium text-brand hover:bg-surface-2">
            Mostrar mais ({filtered.length - visible})
          </button>
        )}
      </section>
    </div>
  );
}

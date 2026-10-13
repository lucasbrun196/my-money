"use client";

import { Repeat } from "lucide-react";
import type { ReactNode } from "react";
import { brl, dateShort, pctShort } from "@/lib/format";

export type SummaryItem = {
  id: string;
  description: string;
  /** Valor positivo = gasto; negativo = estorno/crédito. */
  amount: number;
  category?: string;
  date?: string;
  /** Ex.: "3/10" (parcela) */
  label?: string;
  fixed?: boolean;
  projected?: boolean;
};

export type SummaryData = {
  title: string;
  subtitle?: string;
  /** Total oficial (ex.: valor da fatura no banco); se ausente, soma dos itens. */
  total?: number;
  totalLabel?: string;
  items: SummaryItem[];
  note?: string;
};

/** Conteúdo do resumo de um mês/fatura: total, categorias e lançamentos. */
export function PeriodSummary({ data, action }: { data: SummaryData; action?: ReactNode }) {
  const itemsTotal = data.items.reduce((s, i) => s + i.amount, 0);
  const total = data.total ?? itemsTotal;
  const spendItems = data.items.filter((i) => i.amount > 0);

  const byCategory = new Map<string, number>();
  for (const i of spendItems) {
    const c = i.category ?? "Sem categoria";
    byCategory.set(c, (byCategory.get(c) ?? 0) + i.amount);
  }
  const categories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  const catTotal = categories.reduce((s, [, v]) => s + v, 0);
  const biggest = [...spendItems].sort((a, b) => b.amount - a.amount)[0];
  const sorted = [...data.items].sort((a, b) => (a.date && b.date ? (a.date < b.date ? 1 : -1) : b.amount - a.amount));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        <Stat label={data.totalLabel ?? "Total"} value={<span className="money">{brl(total)}</span>} wide />
        <Stat label="Lançamentos" value={data.items.length} />
        <Stat
          label="Maior gasto"
          value={biggest ? <span className="money">{brl(biggest.amount)}</span> : "—"}
          hint={biggest?.description}
        />
      </div>

      {categories.length > 1 && (
        <section>
          <h3 className="mb-2 text-xs font-medium text-ink-3">Por categoria</h3>
          <ul className="space-y-2">
            {categories.slice(0, 6).map(([cat, value]) => (
              <li key={cat}>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="truncate text-ink-2">{cat}</span>
                  <span className="shrink-0">
                    <span className="money">{brl(value)}</span>{" "}
                    <span className="text-xs text-ink-3">{pctShort(catTotal ? value / catTotal : 0)}</span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full bg-series-1 transition-[width] duration-700 starting:w-0"
                    style={{ width: `${catTotal ? (value / catTotal) * 100 : 0}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="mb-1 text-xs font-medium text-ink-3">Lançamentos</h3>
        {sorted.length === 0 ? (
          <p className="py-4 text-sm text-ink-3">Nenhum lançamento.</p>
        ) : (
          <ul className="divide-y divide-line">
            {sorted.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm">{i.description}</p>
                  <p className="truncate text-xs text-ink-3">
                    {[i.date && dateShort(i.date), i.category, i.label, i.fixed && "fixo", i.projected && "previsto"]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <span className={`money flex shrink-0 items-center gap-1.5 text-sm ${i.amount < 0 ? "text-pos" : ""}`}>
                  {i.fixed && <Repeat className="size-3.5 text-ink-3" aria-label="assinatura" />}
                  {i.amount < 0 ? `−${brl(-i.amount)}` : brl(i.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.note && <p className="text-[11px] text-ink-3">{data.note}</p>}
      {action}
    </div>
  );
}

function Stat({ label, value, hint, wide }: { label: string; value: ReactNode; hint?: string; wide?: boolean }) {
  return (
    <div className="min-w-0 rounded-xl bg-surface-2 p-3">
      <p className="truncate text-[11px] text-ink-3">{label}</p>
      <p className={`truncate font-semibold ${wide ? "text-base" : "text-sm"}`}>{value}</p>
      {hint && <p className="truncate text-[11px] text-ink-3" title={hint}>{hint}</p>}
    </div>
  );
}

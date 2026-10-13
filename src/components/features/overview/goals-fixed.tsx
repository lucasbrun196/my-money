import { CalendarClock, CircleCheck, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { Progress } from "@/components/ui/progress";
import { Unavailable } from "@/components/ui/source-badge";
import type { FixedExpenseStatus } from "@/domain/fixed-expenses";
import { brl, dateShort, monthLabel, pctShort } from "@/lib/format";
import { getBankingView } from "@/server/services/banking";
import { getGoalsView } from "@/server/services/overview";
import { Chip } from "../shared";

export async function GoalsSection({ className }: { className?: string }) {
  const goals = await getGoalsView();
  return (
    <Card title="Metas" icon={<Target />} className={className}>
      <ul className="grid gap-5 md:grid-cols-3">
        {goals.map((g) => {
          const done = g.ratio >= 1;
          return (
            <li key={g.id}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">{g.name}</span>
                <span className={`flex items-center gap-1 text-xs tabular-nums ${done ? "text-good" : "text-ink-2"}`}>
                  {done && <CircleCheck className="size-3.5" aria-hidden />}
                  {pctShort(g.ratio)}
                </span>
              </div>
              <Progress
                ratio={g.ratio}
                color={done ? "var(--color-good)" : "linear-gradient(90deg, var(--color-brand), var(--color-brand-2))"}
                label={`Progresso da meta ${g.name}`}
              />
              <div className="mt-1.5 flex justify-between text-xs text-ink-3">
                <span>
                  <Money value={g.current} className="text-ink-2" /> de <Money value={g.target} />
                </span>
                {!done && <span className="money">faltam {brl(g.remaining)}</span>}
              </div>
              <p className="mt-1 truncate text-[11px] text-ink-3" title={g.sourceLabel}>
                {g.sourceLabel}
              </p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

const METHOD_LABEL = { debito: "Débito", cartao: "Cartão", pix: "PIX" } as const;

function StatusChip({ f }: { f: FixedExpenseStatus }) {
  switch (f.status) {
    case "pago":
      return <Chip tone="good">Pago {f.paidOn && dateShort(f.paidOn)}</Chip>;
    case "lancado":
      return <Chip tone="good">Na fatura</Chip>;
    case "a-lancar":
      return <Chip tone="info">A lançar</Chip>;
    case "pendente":
      return <Chip tone="warning">Pendente{f.dueDate ? ` · ${dateShort(f.dueDate)}` : ""}</Chip>;
  }
}

export async function FixedSection({ className }: { className?: string }) {
  const view = await getBankingView();
  return (
    <Card
      title="Gastos fixos"
      subtitle={
        <span>
          <span className="money">{brl(view.fixedMonthlyTotal)}</span> por mês · detectados nas cobranças que se repetem
        </span>
      }
      icon={<CalendarClock />}
      className={className}
    >
      {!view.hasData && <Unavailable sourced={view.sourced} what="o Santander" />}
      {view.hasData && view.fixed.length === 0 && (
        <p className="text-sm text-ink-3">Nenhuma cobrança recorrente encontrada nos últimos meses.</p>
      )}
      <ul className="divide-y divide-line">
        {view.fixed.map((f) => (
          <li key={f.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{f.name}</p>
              <p className="text-xs text-ink-3">
                {METHOD_LABEL[f.method]}
                {` · desde ${monthLabel(f.since.slice(0, 7))}`}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Money value={f.amount} className="text-sm" />
              {view.hasData && <StatusChip f={f} />}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

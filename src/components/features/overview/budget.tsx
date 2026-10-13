import { AlertTriangle, CircleCheck, Gauge, OctagonAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { Progress } from "@/components/ui/progress";
import { SourceBadge, Unavailable } from "@/components/ui/source-badge";
import type { BudgetStatus } from "@/domain/spending";
import { STATUS_COLOR } from "@/lib/colors";
import { brl, dateBR, dateShort, pctShort } from "@/lib/format";
import { getBankingView } from "@/server/services/banking";

const STATUS_UI: Record<BudgetStatus, { label: string; icon: typeof CircleCheck }> = {
  ok: { label: "Dentro do teto", icon: CircleCheck },
  warning: { label: "Atenção ao ritmo", icon: AlertTriangle },
  danger: { label: "Perto do limite", icon: AlertTriangle },
  over: { label: "Teto estourado", icon: OctagonAlert },
};

export async function BudgetSection({ className }: { className?: string }) {
  const view = await getBankingView();
  if (!view.hasData) {
    return (
      <Card title="Teto da quinzena" icon={<Gauge />} className={className}>
        <Unavailable sourced={view.sourced} what="o Santander" />
      </Card>
    );
  }

  const { budget, fortnight } = view;
  const status = STATUS_UI[budget.status];
  const Icon = status.icon;
  const color = STATUS_COLOR[budget.status];
  const top = [...budget.items].sort((a, b) => b.amount - a.amount).slice(0, 3);

  return (
    <Card
      title="Teto da quinzena"
      subtitle={`${dateShort(fortnight.start)} → ${dateShort(fortnight.nextExpected)} · ${fortnight.detected ? `desde o ${fortnight.partLabel.toLowerCase()}` : fortnight.partLabel}`}
      icon={<Gauge />}
      action={<SourceBadge sourced={view.sourced} />}
      className={className}
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-ink-3">{budget.remaining >= 0 ? "Ainda posso gastar" : "Passei do teto em"}</p>
          <Money value={Math.abs(budget.remaining)} className="text-3xl font-semibold tracking-tight" />
        </div>
        <span className="mb-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium" style={{ color, background: `${color}1f` }}>
          <Icon className="size-3.5" aria-hidden />
          {status.label}
        </span>
      </div>

      <Progress ratio={budget.ratio} color={color} marker={budget.elapsedRatio} className="mt-4" label="Uso do teto da quinzena" />
      <div className="mt-2 flex justify-between text-xs text-ink-3">
        <span>
          Gasto <span className="money text-ink-2">{brl(budget.spent)}</span> de <span className="money">{brl(budget.limit)}</span> ({pctShort(budget.ratio)})
        </span>
        <span>{pctShort(budget.elapsedRatio)} do período</span>
      </div>

      {budget.perDayLeft != null && !fortnight.awaitingSalary && (
        <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-sm text-ink-2">
          Dá para gastar <Money value={budget.perDayLeft} className="font-semibold text-ink" /> por dia nos próximos{" "}
          {fortnight.daysLeft} {fortnight.daysLeft === 1 ? "dia" : "dias"}.
        </p>
      )}

      {fortnight.awaitingSalary && (
        <p className="mt-3 rounded-xl border border-warning/20 bg-warning/8 px-3 py-2 text-xs text-warning">
          O {fortnight.nextLabel.toLowerCase()} previsto para {dateBR(fortnight.nextExpected)} ainda não
          apareceu — o Open Finance pode levar até 24h.
        </p>
      )}

      {top.length > 0 && (
        <div className="mt-4">
          <p className="mb-1 text-xs text-ink-3">Maiores gastos variáveis</p>
          <ul className="divide-y divide-line">
            {top.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                <span className="min-w-0 truncate text-ink-2">{e.description}</span>
                <Money value={e.amount} className="text-ink" />
              </li>
            ))}
          </ul>
        </div>
      )}
      {!fortnight.detected && (
        <p className="mt-3 text-[11px] text-ink-3">Salário não identificado nos créditos da conta: usando a quinzena do calendário.</p>
      )}
    </Card>
  );
}

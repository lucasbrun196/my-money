import { Briefcase, ChevronRight, CreditCard, Wallet } from "lucide-react";
import Link from "next/link";
import { AnimatedBRL } from "@/components/ui/animated-number";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { Progress } from "@/components/ui/progress";
import { SourceBadge, SourceNotes, Unavailable } from "@/components/ui/source-badge";
import { brl, dateBR, dateShort, dateTimeBR, monthLabel, pctShort } from "@/lib/format";
import { getBankingView } from "@/server/services/banking";
import { Row } from "../shared";

export async function BalanceSection({ className }: { className?: string }) {
  const view = await getBankingView();
  const { checking, sourced } = view;

  return (
    <Card title="Saldo em conta" subtitle="Santander · conta corrente" icon={<Wallet />} action={<SourceBadge sourced={sourced} />} className={className}>
      {!checking ? (
        <Unavailable sourced={sourced} what="o Santander" />
      ) : (
        <>
          <AnimatedBRL value={checking.balance} className="text-3xl font-semibold tracking-tight" />
          {checking.reserved.length > 0 && (
            <ul className="mt-3 space-y-1">
              {checking.reserved.map((r) => (
                <Row key={r.name} label={r.name}>
                  <Money value={r.amount} />
                </Row>
              ))}
            </ul>
          )}
          {sourced.data.connection?.lastSyncAt && (
            <p className="mt-3 text-[11px] text-ink-3">
              Última sincronização do banco: {dateTimeBR(sourced.data.connection.lastSyncAt)} · Open Finance pode atrasar até 24h
            </p>
          )}
          <SourceNotes notes={sourced.source === "live" ? sourced.notes : undefined} />
        </>
      )}
    </Card>
  );
}

export async function SalarySection({ className }: { className?: string }) {
  const view = await getBankingView();
  if (!view.hasData) {
    return (
      <Card title="Salário" icon={<Briefcase />} className={className}>
        <Unavailable sourced={view.sourced} what="o Santander" />
      </Card>
    );
  }
  const { salary } = view;

  return (
    <Card
      title="Salário"
      subtitle={salary.employer ? "Detectado automaticamente nos créditos da conta" : undefined}
      icon={<Briefcase />}
      className={className}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-surface-2 p-3">
          <p className="text-xs text-ink-3">Último crédito</p>
          {salary.last ? (
            <>
              <Money value={salary.last.amount} className="text-lg font-semibold" />
              <p className="text-xs text-ink-3">
                {salary.last.part.label} · {dateShort(salary.last.date)}
              </p>
            </>
          ) : (
            <p className="text-sm text-ink-2">Nenhum identificado</p>
          )}
        </div>
        <div className="rounded-xl bg-surface-2 p-3">
          <p className="text-xs text-ink-3">Próximo</p>
          {salary.next?.estimatedAmount != null ? (
            <Money value={salary.next.estimatedAmount} className="text-lg font-semibold" />
          ) : (
            <p className="text-lg font-semibold">—</p>
          )}
          <p className="text-xs text-ink-3">
            {salary.next ? `${salary.next.label} · ~${dateShort(salary.next.expectedDate)}` : "Sem previsão"}
          </p>
        </div>
      </div>
      <Row label="Recebido neste mês" className="mt-2">
        <Money value={salary.thisMonthTotal} />
      </Row>
      {salary.lastFullMonthTotal != null && (
        <Row label="Total do mês passado">
          <Money value={salary.lastFullMonthTotal} />
        </Row>
      )}
    </Card>
  );
}

export async function CardMiniSection({ className }: { className?: string }) {
  const view = await getBankingView();
  const { card } = view;
  if (!view.hasData || !card) {
    return (
      <Card title="Fatura do cartão" icon={<CreditCard />} className={className}>
        <Unavailable sourced={view.sourced} what="o cartão" />
      </Card>
    );
  }

  return (
    <Card
      title={`Fatura de ${monthLabel(card.currentMonth)}`}
      subtitle={`Fecha ${dateShort(card.closeDate)} · vence ${dateShort(card.dueDate)}`}
      icon={<CreditCard />}
      action={
        <Link href="/cartao" className="flex items-center gap-0.5 text-xs text-brand hover:underline">
          Detalhes <ChevronRight className="size-3.5" />
        </Link>
      }
      className={className}
    >
      <p className="text-xs text-ink-3">Parcial da fatura aberta</p>
      <AnimatedBRL value={card.currentTotal} className="text-3xl font-semibold tracking-tight" />
      <Row label="Previsão no fechamento" className="mt-2">
        <Money value={card.forecastClose} />
      </Row>
      {card.closedBill && (
        <Row label={`Fatura fechada · vence ${dateBR(card.closedBill.dueDate)}`}>
          <Money value={card.closedBill.total} className="text-warning" />
        </Row>
      )}
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs text-ink-3">
          <span>Meta anuidade ({pctShort(card.waiver.ratio)})</span>
          <span className="money">faltam {brl(card.waiver.remaining)}</span>
        </div>
        <Progress ratio={card.waiver.ratio} color={card.waiver.ratio >= 1 ? "var(--color-good)" : "var(--color-series-1)"} label="Meta de gasto para isenção da anuidade" />
      </div>
    </Card>
  );
}

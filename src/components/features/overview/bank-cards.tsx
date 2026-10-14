import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { AnimatedBRL } from "@/components/ui/animated-number";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { Progress } from "@/components/ui/progress";
import { SourceBadge, SourceNotes, Unavailable } from "@/components/ui/source-badge";
import { billReferenceMonth } from "@/domain/credit-card";
import { diffDays } from "@/lib/dates";
import { brl, dateBR, dateShort, dateTimeBR, monthLabel, pctShort } from "@/lib/format";
import { getBankingView } from "@/server/services/banking";
import { Row } from "../shared";

export async function BalanceSection({ className }: { className?: string }) {
  const view = await getBankingView();
  const { checking, sourced } = view;

  return (
    <Card title="Saldo em conta" subtitle="Santander · conta corrente" action={<SourceBadge sourced={sourced} />} className={className}>
      {!checking ? (
        <Unavailable sourced={sourced} what="o Santander" />
      ) : (
        <>
          <AnimatedBRL value={checking.balance} className="text-[32px] font-semibold tracking-[-0.03em]" />
          {checking.reserved.length > 0 && (
            <div className="mt-3">
              {checking.reserved.map((r) => (
                <Row key={r.name} label={r.name}>
                  <Money value={r.amount} />
                </Row>
              ))}
            </div>
          )}
          {sourced.data.connection?.lastSyncAt && (
            <p className="mt-4 text-[11px] leading-relaxed text-ink-3">
              Banco sincronizado em {dateTimeBR(sourced.data.connection.lastSyncAt)}. O Open Finance pode atrasar até 24h.
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
      <Card title="Salário" className={className}>
        <Unavailable sourced={view.sourced} what="o Santander" />
      </Card>
    );
  }
  const { salary, today } = view;
  const daysToNext = salary.next ? diffDays(today, salary.next.expectedDate) : null;

  return (
    <Card
      title="Salário"
      subtitle={salary.employer ? "Detectado nos créditos recorrentes da conta" : undefined}
      className={className}
    >
      <div className="grid grid-cols-2 divide-x divide-line">
        <div className="pr-4">
          <p className="eyebrow">Último crédito</p>
          {salary.last ? (
            <>
              <Money value={salary.last.amount} className="mt-1.5 block text-xl font-semibold tracking-tight" />
              <p className="mt-0.5 text-xs text-ink-3">
                {salary.last.part.label} · {dateShort(salary.last.date)}
              </p>
            </>
          ) : (
            <p className="mt-1.5 text-sm text-ink-2">Nenhum identificado</p>
          )}
        </div>
        <div className="pl-4">
          <p className="eyebrow">Próximo</p>
          {salary.next?.estimatedAmount != null ? (
            <Money value={salary.next.estimatedAmount} className="mt-1.5 block text-xl font-semibold tracking-tight" />
          ) : (
            <p className="mt-1.5 text-xl font-semibold">—</p>
          )}
          <p className="mt-0.5 text-xs text-ink-3">
            {salary.next ? `${salary.next.label} · ~${dateShort(salary.next.expectedDate)}` : "Sem previsão"}
          </p>
        </div>
      </div>

      {daysToNext != null && daysToNext >= 0 && (
        <p className="mt-4 inline-flex items-baseline gap-1.5 rounded-md bg-surface-2 px-2.5 py-1.5 text-xs text-ink-2">
          <span className="tnum font-mono text-sm font-medium text-ink">{daysToNext}</span>
          {daysToNext === 1 ? "dia" : "dias"} para o próximo crédito
        </p>
      )}

      <div className="mt-3">
        <Row label="Recebido neste mês">
          <Money value={salary.thisMonthTotal} />
        </Row>
        {salary.lastFullMonthTotal != null && (
          <Row label="Total do mês passado">
            <Money value={salary.lastFullMonthTotal} />
          </Row>
        )}
      </div>
    </Card>
  );
}

export async function CardMiniSection({ className }: { className?: string }) {
  const view = await getBankingView();
  const { card } = view;
  if (!view.hasData || !card) {
    return (
      <Card title="Fatura do cartão" className={className}>
        <Unavailable sourced={view.sourced} what="o cartão" />
      </Card>
    );
  }

  return (
    <Card
      title={`Fatura de ${monthLabel(billReferenceMonth(card.closeDate))}`}
      subtitle={`Fecha ${dateShort(card.closeDate)} · vence ${dateShort(card.dueDate)}`}
      action={
        <Link
          href="/cartao"
          className="group inline-flex items-center gap-0.5 text-xs text-ink-2 transition-colors hover:text-ink"
        >
          Detalhes
          <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      }
      className={className}
    >
      <p className="eyebrow">Parcial da fatura aberta</p>
      <AnimatedBRL value={card.currentTotal} className="mt-1.5 text-[32px] font-semibold tracking-[-0.03em]" />
      <div className="mt-3">
        <Row label="Previsão no fechamento">
          <Money value={card.forecastClose} />
        </Row>
        {card.closedBill && (
          <Row label={`Fechada · vence ${dateBR(card.closedBill.dueDate)}`}>
            <Money value={card.closedBill.total} className="text-warning" />
          </Row>
        )}
      </div>
      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-xs text-ink-3">
          <span>Meta da anuidade · {pctShort(card.waiver.ratio)}</span>
          <span className="money">{card.waiver.ratio >= 1 ? "batida" : `faltam ${brl(card.waiver.remaining)}`}</span>
        </div>
        <Progress
          ratio={card.waiver.ratio}
          color={card.waiver.ratio >= 1 ? "var(--color-good)" : "var(--color-series-1)"}
          label="Meta de gasto para isenção da anuidade"
        />
      </div>
    </Card>
  );
}

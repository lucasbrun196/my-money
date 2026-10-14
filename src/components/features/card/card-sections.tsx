import { AnimatedBRL } from "@/components/ui/animated-number";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { Progress } from "@/components/ui/progress";
import { SourceBadge, Unavailable } from "@/components/ui/source-badge";
import { financeConfig } from "@/config/finance";
import { cn } from "@/lib/cn";
import { SERIES } from "@/lib/colors";
import { brl, dateBR, dateShort, monthLabel, pctShort } from "@/lib/format";
import { addDays, addMonths, diffDays, monthOf } from "@/lib/dates";
import { billDates, billReference, billReferenceMonth, resolveBillMonth } from "@/domain/credit-card";
import type { ISODate, Transaction } from "@/domain/types";
import type { BankingView } from "@/server/services/banking";
import type { CardCycle } from "@/domain/credit-card";
import type { SummaryData } from "../period-summary";
import { Chip, Insight, Row } from "../shared";
import { BillTrend, type CycleDay, type MonthlyBill } from "./bill-trend";

/** Visão com cartão garantido (a página só renderiza estes cards quando há cartão). */
export type CardView = BankingView & { card: NonNullable<BankingView["card"]>; cycle: CardCycle };

export function hasCard(view: BankingView): view is CardView {
  return view.card !== null && view.cycle !== null;
}

/** Primeiro dia do ciclo da fatura aberta (dia seguinte ao último fechamento). */
function cycleStart(view: CardView): ISODate {
  const { card, cycle } = view;
  const lastClose =
    view.bills.find((b) => monthOf(b.dueDate) === addMonths(card.currentMonth, -1))?.closeDate ??
    billDates(addMonths(card.currentMonth, -1), cycle).closeDate;
  return addDays(lastClose, 1);
}

export function CardUnavailable({ view }: { view: BankingView }) {
  return (
    <Card title="Cartão de crédito">
      <Unavailable sourced={view.sourced} what="o cartão" />
    </Card>
  );
}

/**
 * Linha do tempo do ciclo: início → hoje → fechamento → vencimento.
 * Mostra de relance em que ponto da fatura você está.
 */
function CycleTimeline({ start, today, close, due }: { start: ISODate; today: ISODate; close: ISODate; due: ISODate }) {
  const span = Math.max(diffDays(start, due), 1);
  const at = (d: ISODate) => Math.min(Math.max(diffDays(start, d) / span, 0), 1) * 100;
  const todayPos = at(today < close ? today : close);
  const closePos = at(close);

  return (
    <div aria-label={`Ciclo de ${dateShort(start)} a ${dateShort(close)}, vencimento ${dateShort(due)}`} role="img">
      <div className="relative mb-2 h-3">
        <span
          className="eyebrow absolute -translate-x-1/2 leading-none text-ink-2"
          style={{ left: `clamp(1rem, ${todayPos}%, calc(100% - 1rem))` }}
        >
          hoje
        </span>
      </div>
      <div className="relative h-1.5">
        <div className="absolute inset-y-0 left-0 rounded-full bg-surface-3" style={{ width: `${closePos}%` }} />
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-series-1 transition-[width] duration-[1400ms] ease-out-expo starting:w-0"
          style={{ width: `${todayPos}%` }}
        />
        <div
          className="absolute inset-y-0 rounded-full bg-[repeating-linear-gradient(90deg,var(--color-warning)_0_4px,transparent_4px_7px)] opacity-70"
          style={{ left: `calc(${closePos}% + 3px)`, right: 0 }}
        />
        <span className="absolute top-1/2 size-3 -translate-1/2 rounded-full border-2 border-surface bg-ink" style={{ left: `${todayPos}%` }} />
        <span className="absolute top-1/2 size-2.5 -translate-1/2 rounded-full border-2 border-surface bg-ink-2" style={{ left: `${closePos}%` }} />
        <span className="absolute top-1/2 right-0 size-2.5 translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-warning" />
      </div>
      <div className="relative mt-2.5 h-8 text-[11px]">
        <span className="absolute left-0 text-ink-3">
          <span className="eyebrow block">início</span>
          {dateShort(start)}
        </span>
        <span
          className={cn("absolute text-ink-3", closePos > 70 ? "-translate-x-full pr-2 text-right" : "-translate-x-1/2 text-center")}
          style={{ left: `${closePos}%` }}
        >
          <span className="eyebrow block">fecha</span>
          {dateShort(close)}
        </span>
        <span className="absolute right-0 text-right text-warning">
          <span className="eyebrow block text-warning/80">vence</span>
          {dateShort(due)}
        </span>
      </div>
    </div>
  );
}

export function CurrentBillCard({ view }: { view: CardView }) {
  const { card, today } = view;
  const cardName = view.cardInfo?.name.trim() || "Cartão de crédito";
  const bestDay = (view.cycle.closingDay % 31) + 1;
  const pending = [...card.pendingFixed, ...card.pendingInstallments];

  return (
    <Card
      title={`Fatura aberta · ${monthLabel(billReferenceMonth(card.closeDate))}`}
      subtitle={cardName}
      action={<SourceBadge sourced={view.sourced} />}
      className="lg:col-span-2"
    >
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-[1fr_1fr]">
        <div>
          <p className="eyebrow">Parcial até agora</p>
          <AnimatedBRL value={card.currentTotal} className="mt-1.5 text-[40px] font-semibold tracking-[-0.03em]" />
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Chip tone="info">
              Fecha em {card.daysToClose} {card.daysToClose === 1 ? "dia" : "dias"}
            </Chip>
            <Chip>Melhor dia de compra: {String(bestDay).padStart(2, "0")}</Chip>
          </div>
        </div>
        <div className="rounded-lg border border-line p-3.5">
          <p className="eyebrow mb-1">Como a fatura deve fechar</p>
          <Row label="Já lançado">
            <Money value={card.currentTotal} />
          </Row>
          {pending.map((p) => (
            <Row
              key={`${p.description}-${p.label ?? ""}`}
              label={
                <span className="text-xs">
                  + {p.description}
                  {p.label ? ` ${p.label}` : ""}
                </span>
              }
            >
              <Money value={p.amount} className="text-ink-2" />
            </Row>
          ))}
          <div className="mt-1.5 flex items-baseline justify-between gap-3 border-t border-line pt-2.5">
            <span className="text-sm font-medium">Previsão no fechamento</span>
            <Money value={card.forecastClose} className="text-base font-semibold" />
          </div>
        </div>
      </div>

      <div className="mt-6">
        <CycleTimeline start={cycleStart(view)} today={today} close={card.closeDate} due={card.dueDate} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="text-ink-2">Meta de {brl(card.waiver.target)} (isenção da anuidade)</span>
            <span className="tnum font-mono text-ink-3">{pctShort(card.waiver.ratio)}</span>
          </div>
          <Progress
            ratio={card.waiver.ratio}
            color={card.waiver.ratio >= 1 ? "var(--color-good)" : "var(--color-series-1)"}
            marker={card.waiver.ratio < 1 ? Math.min(card.waiver.forecast / card.waiver.target, 0.999) : undefined}
            label="Meta de gasto na fatura para isenção da anuidade"
          />
          <p className="mt-1.5 text-xs text-ink-3">
            {card.waiver.ratio >= 1 ? (
              <span className="text-good">Meta batida nesta fatura.</span>
            ) : (
              <>
                Faltam <Money value={card.waiver.remaining} />. Com o previsto, chega a{" "}
                <span className={card.waiver.forecast >= card.waiver.target ? "text-good" : "text-ink-2"}>
                  {pctShort(card.waiver.forecast / card.waiver.target)}
                </span>{" "}
                (traço).
              </>
            )}
          </p>
        </div>
        {card.limit && (
          <div>
            <div className="mb-1.5 flex justify-between text-xs">
              <span className="text-ink-2">Limite usado</span>
              <span className="tnum font-mono text-ink-3">{pctShort(card.limit.used / card.limit.total)}</span>
            </div>
            <Progress ratio={card.limit.used / card.limit.total} color="var(--color-series-7)" label="Limite do cartão usado" />
            <p className="mt-1.5 text-xs text-ink-3">
              Disponível <Money value={card.limit.available} className="text-ink-2" /> de <Money value={card.limit.total} />
            </p>
          </div>
        )}
      </div>

      {card.closedBill && (
        <Insight tone="warning" className="mt-5">
          Fatura fechada de <Money value={card.closedBill.total} className="font-medium text-ink" /> vence em{" "}
          {dateBR(card.closedBill.dueDate)}.
        </Insight>
      )}
    </Card>
  );
}

/** Parcelas como "casinhas": cada bloco é uma parcela, preenchido se já caiu. */
function InstallmentPips({ current, total, label }: { current: number; total: number; label: string }) {
  if (total > 24) {
    return <Progress ratio={current / total} color={SERIES[0]} size="sm" className="mt-2" label={label} />;
  }
  return (
    <div className="mt-2 flex gap-[3px]" role="img" aria-label={`${label}: ${current} de ${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 flex-1 rounded-[2px] transition-opacity duration-500 starting:opacity-0",
            i < current ? "bg-series-1" : "bg-surface-3",
          )}
          style={{ transitionDelay: `${i * 30}ms` }}
        />
      ))}
    </div>
  );
}

export function InstallmentPlansCard({ view }: { view: CardView }) {
  const plans = view.card.plans;
  const totalRemaining = plans.reduce((s, p) => s + p.remainingAmount, 0);
  return (
    <Card title="Parcelamentos ativos" subtitle={`${plans.length} ${plans.length === 1 ? "compra" : "compras"} em andamento`}>
      {plans.length === 0 ? (
        <p className="text-sm text-ink-3">Nenhuma compra parcelada em aberto.</p>
      ) : (
        <>
          <p className="eyebrow">A pagar depois desta fatura</p>
          <Money value={totalRemaining} className="mt-1.5 block text-xl font-semibold tracking-tight" />
          <ul className="mt-4 space-y-4">
            {plans.map((p) => (
              <li key={`${p.description}-${p.total}-${p.amount}`}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{p.description.replace(/\s*PARC.*$/i, "")}</span>
                  <span className="shrink-0 text-xs text-ink-3">
                    <Money value={p.amount} className="text-sm text-ink" />
                    /mês
                  </span>
                </div>
                <InstallmentPips current={p.current} total={p.total} label={`Parcelas pagas de ${p.description}`} />
                <p className="mt-1.5 flex justify-between gap-3 text-[11px] text-ink-3">
                  <span className="tnum font-mono">
                    {p.current}/{p.total}
                  </span>
                  <span>
                    faltam <span className="money">{brl(p.remainingAmount)}</span> · até {monthLabel(billReference(p.endsIn, view.cycle))}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

export function CurrentBillItemsCard({ view }: { view: CardView }) {
  const items = view.card.currentItems;
  return (
    <Card title="Lançamentos da fatura aberta" subtitle={`${items.length} ${items.length === 1 ? "item" : "itens"}`} className="lg:col-span-3">
      <ul className="thin-scroll -mx-2 max-h-[480px] overflow-y-auto">
        {items.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-surface-2">
            <div className="flex min-w-0 items-center gap-3">
              <span className="tnum w-11 shrink-0 font-mono text-[11px] text-ink-3">{dateShort(t.date)}</span>
              <div className="min-w-0">
                <p className="truncate text-sm">{t.description}</p>
                <p className="truncate text-xs text-ink-3">
                  {t.category}
                  {t.installment && ` · parcela ${t.installment.number}/${t.installment.total}`}
                </p>
              </div>
            </div>
            <Money value={-t.amount} className={cn("text-sm", t.amount > 0 && "text-pos")} signed={t.amount > 0} />
          </li>
        ))}
        {items.length === 0 && <li className="px-2 py-4 text-sm text-ink-3">Nenhum lançamento ainda.</li>}
      </ul>
    </Card>
  );
}

function toSummaryItems(txs: Transaction[]) {
  return txs.map((t) => ({
    id: t.id,
    description: t.description.trim(),
    amount: -t.amount, // compra positiva, estorno negativo
    category: t.category,
    date: t.date,
    label: t.installment ? `${t.installment.number}/${t.installment.total}` : undefined,
  }));
}

/** Evolução das faturas: mês atual (dia a dia), 6/12 meses ou um ano específico. */
export function BillTrendCard({ view }: { view: CardView }) {
  const { card, today, cycle: cardCycle } = view;
  const cardTxs = view.sourced.data.transactions.filter((t) => t.source === "cartao" && t.kind !== "card-payment");

  const currentDetails: SummaryData = {
    title: `Fatura de ${monthLabel(billReferenceMonth(card.closeDate))} (aberta)`,
    subtitle: `Fecha ${dateShort(card.closeDate)} · vence ${dateBR(card.dueDate)}`,
    total: card.currentTotal,
    totalLabel: "Parcial até agora",
    items: toSummaryItems(card.currentItems),
  };

  const closed: MonthlyBill[] = view.bills
    .filter((b) => monthOf(b.dueDate) < card.currentMonth)
    .map((b) => {
      const month = monthOf(b.dueDate);
      const ref = billReferenceMonth(b.closeDate ?? billDates(month, cardCycle).closeDate);
      const items = cardTxs.filter((t) => resolveBillMonth(t, cardCycle) === month);
      const sum = items.reduce((s, t) => s - t.amount, 0);
      return {
        month,
        ref,
        total: b.total,
        open: false,
        details: {
          title: `Fatura de ${monthLabel(ref)}`,
          subtitle: `${b.closeDate ? `Fechou ${dateShort(b.closeDate)} · ` : ""}venceu ${dateBR(b.dueDate)}`,
          total: b.total,
          totalLabel: "Total da fatura",
          items: toSummaryItems(items),
          note:
            Math.abs(sum - b.total) > 0.05
              ? `A soma dos lançamentos (${brl(sum)}) difere do total do banco: juros, encargos, saldo de fatura anterior ou compras de antes do período disponível.`
              : undefined,
        },
      };
    });
  const monthly: MonthlyBill[] = [...closed, { month: card.currentMonth, ref: billReferenceMonth(card.closeDate), total: card.currentTotal, open: true, details: currentDetails }];

  // Mês atual: do dia seguinte ao último fechamento até hoje, acumulando a fatura aberta.
  const start = cycleStart(view);
  // Os dias até o fechamento entram no eixo (sem valor) para a previsão ser desenhada até lá.
  const cycle: CycleDay[] = [];
  for (let d = start; d <= card.closeDate; d = addDays(d, 1)) {
    if (d > today) {
      cycle.push({ date: d, total: null });
      continue;
    }
    const total = card.currentItems.filter((t) => t.date <= d).reduce((s, t) => s - t.amount, 0);
    cycle.push({ date: d, total: Math.round(total * 100) / 100 });
  }

  return (
    <Card title="Evolução das faturas" subtitle="Toque no gráfico para ver os lançamentos" className="lg:col-span-3">
      <BillTrend
        monthly={monthly}
        cycle={cycle}
        target={financeConfig.creditCard.annualFeeWaiverTarget}
        forecast={card.forecastClose}
        currentDetails={currentDetails}
      />
    </Card>
  );
}

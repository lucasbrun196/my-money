import { CalendarClock, CreditCard, Layers, ReceiptText, Repeat } from "lucide-react";
import { AnimatedBRL } from "@/components/ui/animated-number";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { Progress } from "@/components/ui/progress";
import { SourceBadge, Unavailable } from "@/components/ui/source-badge";
import { financeConfig } from "@/config/finance";
import { SERIES } from "@/lib/colors";
import { brl, dateBR, dateShort, monthLabel, pctShort } from "@/lib/format";
import { addDays, addMonths, monthOf } from "@/lib/dates";
import { billDates, resolveBillMonth } from "@/domain/credit-card";
import type { Transaction } from "@/domain/types";
import type { BankingView } from "@/server/services/banking";
import type { CardCycle } from "@/domain/credit-card";

/** Visão com cartão garantido (a página só renderiza estes cards quando há cartão). */
export type CardView = BankingView & { card: NonNullable<BankingView["card"]>; cycle: CardCycle };

export function hasCard(view: BankingView): view is CardView {
  return view.card !== null && view.cycle !== null;
}
import type { SummaryData } from "../period-summary";
import { Chip, Row } from "../shared";
import { BillTrend, type CycleDay, type MonthlyBill } from "./bill-trend";

export function CardUnavailable({ view }: { view: BankingView }) {
  return (
    <Card title="Cartão de crédito" icon={<CreditCard />}>
      <Unavailable sourced={view.sourced} what="o cartão" />
    </Card>
  );
}

export function CurrentBillCard({ view }: { view: CardView }) {
  const { card } = view;
  const cardName = view.cardInfo?.name.trim() || "Cartão de crédito";
  const bestDay = (view.cycle.closingDay % 31) + 1;
  const pending = [...card.pendingFixed, ...card.pendingInstallments];

  return (
    <Card
      title={`Fatura aberta · ${monthLabel(card.currentMonth)}`}
      subtitle={cardName}
      icon={<CreditCard />}
      action={<SourceBadge sourced={view.sourced} />}
      className="lg:col-span-2"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <p className="text-xs text-ink-3">Parcial até agora</p>
          <AnimatedBRL value={card.currentTotal} className="text-4xl font-semibold tracking-tight" />
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip tone="info">Fecha {dateShort(card.closeDate)} · em {card.daysToClose} {card.daysToClose === 1 ? "dia" : "dias"}</Chip>
            <Chip>Vence {dateShort(card.dueDate)}</Chip>
            <Chip>Melhor dia de compra: {String(bestDay).padStart(2, "0")}</Chip>
          </div>
        </div>
        <div className="space-y-1 rounded-xl bg-surface-2 p-3">
          <Row label="Lançado">
            <Money value={card.currentTotal} />
          </Row>
          {pending.map((p) => (
            <Row key={`${p.description}-${p.label ?? ""}`} label={<span className="text-xs">+ {p.description}{p.label ? ` ${p.label}` : ""} (previsto)</span>}>
              <Money value={p.amount} className="text-ink-2" />
            </Row>
          ))}
          <Row label={<span className="font-medium text-ink">Previsão no fechamento</span>} className="border-t border-line pt-2">
            <Money value={card.forecastClose} className="font-semibold" />
          </Row>
        </div>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-ink-2">Meta de {brl(card.waiver.target)} (isenção da anuidade)</span>
            <span className="text-ink-3 tabular-nums">{pctShort(card.waiver.ratio)}</span>
          </div>
          <Progress
            ratio={card.waiver.ratio}
            color={card.waiver.ratio >= 1 ? "var(--color-good)" : "var(--color-series-1)"}
            label="Meta de gasto na fatura para isenção da anuidade"
          />
          <p className="mt-1 text-xs text-ink-3">
            {card.waiver.ratio >= 1 ? (
              "Meta batida nesta fatura ✓"
            ) : (
              <>
                Faltam <Money value={card.waiver.remaining} /> · com o previsto:{" "}
                <span className={card.waiver.forecast >= card.waiver.target ? "text-good" : ""}>
                  {pctShort(card.waiver.forecast / card.waiver.target)}
                </span>
              </>
            )}
          </p>
        </div>
        {card.limit && (
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-ink-2">Limite usado</span>
              <span className="text-ink-3 tabular-nums">{pctShort(card.limit.used / card.limit.total)}</span>
            </div>
            <Progress ratio={card.limit.used / card.limit.total} color="var(--color-series-7)" label="Limite do cartão usado" />
            <p className="mt-1 text-xs text-ink-3">
              Disponível <Money value={card.limit.available} /> de <Money value={card.limit.total} />
            </p>
          </div>
        )}
      </div>

      {card.closedBill && (
        <p className="mt-4 rounded-xl border border-warning/20 bg-warning/8 px-3 py-2 text-sm text-warning">
          Fatura fechada de <Money value={card.closedBill.total} className="font-semibold" /> vence em {dateBR(card.closedBill.dueDate)}.
        </p>
      )}
    </Card>
  );
}

export function NextBillCard({ view }: { view: CardView }) {
  const next = view.card.upcoming[0];
  if (!next) return null;
  return (
    <Card title={`Prévia da próxima · ${monthLabel(next.month)}`} subtitle={`Fecha ${dateShort(next.closeDate)} · vence ${dateShort(next.dueDate)}`} icon={<CalendarClock />}>
      <Money value={next.total} className="text-3xl font-semibold tracking-tight" />
      <p className="mt-1 text-xs text-ink-3">Já comprometido: parcelas + assinaturas. Novas compras somam a isso.</p>
      <ul className="mt-3 divide-y divide-line">
        {next.items.map((i, idx) => (
          <li key={`${i.description}-${idx}`} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="min-w-0 truncate text-ink-2">
              {i.description}
              {i.label && <span className="text-ink-3"> · {i.label}</span>}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              {i.kind === "fixo" && <Repeat className="size-3.5 text-ink-3" aria-label="assinatura" />}
              <Money value={i.amount} />
            </span>
          </li>
        ))}
        {next.items.length === 0 && <li className="py-3 text-sm text-ink-3">Nada comprometido ainda.</li>}
      </ul>
    </Card>
  );
}

export function InstallmentPlansCard({ view }: { view: CardView }) {
  const plans = view.card.plans;
  const totalRemaining = plans.reduce((s, p) => s + p.remainingAmount, 0);
  return (
    <Card title="Parcelamentos ativos" subtitle={<span className="money">{brl(totalRemaining)} a pagar depois desta fatura</span>} icon={<Layers />}>
      {plans.length === 0 ? (
        <p className="text-sm text-ink-3">Nenhuma compra parcelada em aberto.</p>
      ) : (
        <ul className="space-y-3">
          {plans.map((p) => (
            <li key={`${p.description}-${p.total}-${p.amount}`}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">{p.description.replace(/\s*PARC.*$/i, "")}</span>
                <Money value={p.amount} className="shrink-0" />
              </div>
              <Progress ratio={p.current / p.total} color={SERIES[0]} className="mt-1.5 h-1.5" label={`Parcelas pagas de ${p.description}`} />
              <p className="mt-1 text-xs text-ink-3">
                {p.current}/{p.total} · faltam {p.remaining} ({brl(p.remainingAmount)}) · termina em {monthLabel(p.endsIn)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function CurrentBillItemsCard({ view }: { view: CardView }) {
  const items = view.card.currentItems;
  return (
    <Card title="Lançamentos da fatura aberta" subtitle={`${items.length} itens`} icon={<ReceiptText />} className="lg:col-span-2">
      <ul className="max-h-[480px] divide-y divide-line overflow-y-auto pr-1">
        {items.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm">{t.description}</p>
              <p className="text-xs text-ink-3">
                {dateShort(t.date)} · {t.category}
                {t.installment && ` · ${t.installment.number}/${t.installment.total}`}
              </p>
            </div>
            <Money value={-t.amount} className={t.amount > 0 ? "text-pos" : ""} signed={t.amount > 0} />
          </li>
        ))}
        {items.length === 0 && <li className="py-4 text-sm text-ink-3">Nenhum lançamento ainda.</li>}
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
    title: `Fatura de ${monthLabel(card.currentMonth)} (aberta)`,
    subtitle: `Fecha ${dateShort(card.closeDate)} · vence ${dateBR(card.dueDate)}`,
    total: card.currentTotal,
    totalLabel: "Parcial até agora",
    items: toSummaryItems(card.currentItems),
  };

  const closed: MonthlyBill[] = view.bills
    .filter((b) => monthOf(b.dueDate) < card.currentMonth)
    .map((b) => {
      const month = monthOf(b.dueDate);
      const items = cardTxs.filter((t) => resolveBillMonth(t, cardCycle) === month);
      const sum = items.reduce((s, t) => s - t.amount, 0);
      return {
        month,
        total: b.total,
        open: false,
        details: {
          title: `Fatura de ${monthLabel(month)}`,
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
  const monthly: MonthlyBill[] = [...closed, { month: card.currentMonth, total: card.currentTotal, open: true, details: currentDetails }];

  // Mês atual: do dia seguinte ao último fechamento até hoje, acumulando a fatura aberta.
  const lastClose =
    view.bills.find((b) => monthOf(b.dueDate) === addMonths(card.currentMonth, -1))?.closeDate ??
    billDates(addMonths(card.currentMonth, -1), cardCycle).closeDate;
  const start = addDays(lastClose, 1);
  const end = today < card.closeDate ? today : card.closeDate;
  const cycle: CycleDay[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const total = card.currentItems.filter((t) => t.date <= d).reduce((s, t) => s - t.amount, 0);
    cycle.push({ date: d, total: Math.round(total * 100) / 100 });
  }

  return (
    <Card title="Evolução das faturas" icon={<ReceiptText />} className="lg:col-span-2">
      <BillTrend monthly={monthly} cycle={cycle} target={financeConfig.creditCard.annualFeeWaiverTarget} currentDetails={currentDetails} />
    </Card>
  );
}

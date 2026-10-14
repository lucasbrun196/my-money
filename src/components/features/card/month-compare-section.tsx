import { Card } from "@/components/ui/card";
import { SourceBadge } from "@/components/ui/source-badge";
import { buildBillCycles } from "@/domain/compare";
import type { CardView } from "./card-sections";
import { MonthCompare } from "./month-compare";

/** Painel "Comparar faturas": fatura com fatura, pelo valor cobrado pelo banco. */
export function MonthCompareSection({ view, className }: { view: CardView; className?: string }) {
  const bills = buildBillCycles({
    bills: view.bills,
    open: { key: view.card.currentMonth, closeDate: view.card.closeDate, dueDate: view.card.dueDate, total: view.card.currentTotal },
    cycle: view.cycle,
    transactions: view.sourced.data.transactions,
  });
  return (
    <Card
      title="Comparar faturas"
      subtitle="Escolha duas faturas quaisquer dos últimos 12 meses (limite do Open Finance)"
      action={<SourceBadge sourced={view.sourced} />}
      className={className}
    >
      <MonthCompare bills={bills} today={view.today} />
    </Card>
  );
}

import { Suspense } from "react";
import { BalanceSection, CardMiniSection, SalarySection } from "@/components/features/overview/bank-cards";
import { BudgetSection } from "@/components/features/overview/budget";
import { FixedSection, GoalsSection } from "@/components/features/overview/goals-fixed";
import { NetWorthSection } from "@/components/features/overview/net-worth";
import { PageHeader } from "@/components/ui/card";
import { CardSkeleton } from "@/components/ui/skeleton";

/**
 * Visão geral. O cabeçalho e os esqueletos saem na hora (static shell);
 * cada seção chega por streaming assim que os dados dela ficam prontos.
 */
export default function OverviewPage() {
  return (
    <>
      <PageHeader title="Visão geral" description="Patrimônio, teto de gastos, metas e compromissos do mês." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Suspense fallback={<CardSkeleton chart className="lg:col-span-2" />}>
          <NetWorthSection className="lg:col-span-2" />
        </Suspense>
        <Suspense fallback={<CardSkeleton lines={4} />}>
          <BudgetSection />
        </Suspense>
        <Suspense fallback={<CardSkeleton lines={2} />}>
          <BalanceSection />
        </Suspense>
        <Suspense fallback={<CardSkeleton lines={2} />}>
          <SalarySection />
        </Suspense>
        <Suspense fallback={<CardSkeleton lines={3} />}>
          <CardMiniSection />
        </Suspense>
        <Suspense fallback={<CardSkeleton lines={3} className="lg:col-span-2" />}>
          <GoalsSection className="lg:col-span-2" />
        </Suspense>
        <Suspense fallback={<CardSkeleton lines={4} />}>
          <FixedSection />
        </Suspense>
      </div>
    </>
  );
}

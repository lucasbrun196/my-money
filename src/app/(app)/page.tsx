import { Suspense } from "react";
import { BalanceSection, CardMiniSection, SalarySection } from "@/components/features/overview/bank-cards";
import { ReservesSection } from "@/components/features/overview/reserves";
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
      <PageHeader kicker="Início" title="Visão geral" description="Patrimônio, saldo, salário, fatura e reservas." />
      <div className="stagger grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3">
        <Suspense fallback={<CardSkeleton chart className="lg:col-span-3" />}>
          <NetWorthSection className="lg:col-span-3" />
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
        <Suspense fallback={<CardSkeleton lines={3} className="lg:col-span-3" />}>
          <ReservesSection className="lg:col-span-3" />
        </Suspense>
      </div>
    </>
  );
}

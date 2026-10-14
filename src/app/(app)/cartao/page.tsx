import type { Metadata } from "next";
import { Suspense } from "react";
import {
  BillTrendCard,
  CardUnavailable,
  hasCard,
  CurrentBillCard,
  CurrentBillItemsCard,
  InstallmentPlansCard,
} from "@/components/features/card/card-sections";
import { MonthCompareSection } from "@/components/features/card/month-compare-section";
import { PageHeader } from "@/components/ui/card";
import { CardSkeleton } from "@/components/ui/skeleton";
import { getBankingView } from "@/server/services/banking";

export const metadata: Metadata = { title: "Cartão" };

async function CardContent() {
  const view = await getBankingView();
  if (!view.hasData || !hasCard(view)) return <CardUnavailable view={view} />;
  return (
    <div className="stagger grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3">
      <CurrentBillCard view={view} />
      <InstallmentPlansCard view={view} />
      <MonthCompareSection view={view} className="lg:col-span-3" />
      <BillTrendCard view={view} />
      <CurrentBillItemsCard view={view} />
    </div>
  );
}

export default function CartaoPage() {
  return (
    <>
      <PageHeader kicker="Crédito" title="Cartão de crédito" description="Fatura aberta, previsão de fechamento, parcelamentos e comparação entre faturas." />
      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <CardSkeleton lines={4} className="lg:col-span-2" />
            <CardSkeleton lines={4} />
            <CardSkeleton chart className="lg:col-span-3" />
          </div>
        }
      >
        <CardContent />
      </Suspense>
    </>
  );
}

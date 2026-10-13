import type { Metadata } from "next";
import { Suspense } from "react";
import {
  BillTrendCard,
  CardUnavailable,
  hasCard,
  CurrentBillCard,
  CurrentBillItemsCard,
  InstallmentPlansCard,
  NextBillCard,
} from "@/components/features/card/card-sections";
import { PageHeader } from "@/components/ui/card";
import { CardSkeleton } from "@/components/ui/skeleton";
import { getBankingView } from "@/server/services/banking";

export const metadata: Metadata = { title: "Cartão" };

async function CardContent() {
  const view = await getBankingView();
  if (!view.hasData || !hasCard(view)) return <CardUnavailable view={view} />;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <CurrentBillCard view={view} />
      <NextBillCard view={view} />
      <BillTrendCard view={view} />
      <InstallmentPlansCard view={view} />
      <CurrentBillItemsCard view={view} />
    </div>
  );
}

export default function CartaoPage() {
  return (
    <>
      <PageHeader title="Cartão de crédito" description="Fatura aberta, previsão de fechamento, parcelas futuras e próximas faturas." />
      <Suspense
        fallback={
          <div className="grid gap-4 lg:grid-cols-3">
            <CardSkeleton lines={4} className="lg:col-span-2" />
            <CardSkeleton lines={4} />
            <CardSkeleton chart className="lg:col-span-2" />
            <CardSkeleton lines={4} />
          </div>
        }
      >
        <CardContent />
      </Suspense>
    </>
  );
}

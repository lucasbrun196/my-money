import type { Metadata } from "next";
import { Suspense } from "react";
import { SpendingExplorer } from "@/components/features/spending/spending-explorer";
import { Card, PageHeader } from "@/components/ui/card";
import { CardSkeleton, Skeleton } from "@/components/ui/skeleton";
import { SourceBadge, Unavailable } from "@/components/ui/source-badge";
import { getBankingView } from "@/server/services/banking";

export const metadata: Metadata = { title: "Gastos" };

async function Spending() {
  const view = await getBankingView();
  if (!view.hasData) {
    return (
      <Card title="Gastos">
        <Unavailable sourced={view.sourced} what="o Santander" />
      </Card>
    );
  }
  return (
    <>
      <div className="mb-3 flex justify-end">
        <SourceBadge sourced={view.sourced} />
      </div>
      {/* Os 12 meses vão para o navegador uma vez; trocar filtros não chama o servidor. */}
      <SpendingExplorer expenses={view.expenses} today={view.today} />
    </>
  );
}

export default function GastosPage() {
  return (
    <>
      <PageHeader
        kicker="Conta + cartão"
        title="Gastos"
        description="Tudo o que saiu da conta e do cartão. Transferências entre contas próprias, aplicações e pagamento de fatura ficam de fora."
      />
      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-36 w-full rounded-[14px]" />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <CardSkeleton chart className="lg:col-span-2" />
              <CardSkeleton chart />
            </div>
          </div>
        }
      >
        <Spending />
      </Suspense>
    </>
  );
}

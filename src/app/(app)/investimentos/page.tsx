import type { Metadata } from "next";
import { Suspense } from "react";
import { PortfolioSection } from "@/components/features/investments/portfolio";
import { PageHeader } from "@/components/ui/card";
import { CardSkeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Investimentos" };

export default function InvestimentosPage() {
  return (
    <>
      <PageHeader title="Investimentos" description="Posições do Open Finance (XP e Santander), com cotação atual da B3 para as ações." />
      <Suspense
        fallback={
          <div className="grid gap-4 lg:grid-cols-3">
            <CardSkeleton lines={2} className="lg:col-span-2" />
            <CardSkeleton chart />
            <CardSkeleton lines={6} className="lg:col-span-3" />
          </div>
        }
      >
        <PortfolioSection />
      </Suspense>
    </>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { IndicatorsSection } from "@/components/features/investments/indicators-section";
import { PortfolioSection } from "@/components/features/investments/portfolio";
import { PageHeader } from "@/components/ui/card";
import { CardSkeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Investimentos" };

export default function InvestimentosPage() {
  return (
    <>
      <PageHeader kicker="Mercado e carteira" title="Investimentos" description="Indicadores de mercado e posições do Open Finance (XP e Santander)." />
      <div className="space-y-4">
        {/* Cada bloco chega por streaming de forma independente. */}
        <Suspense fallback={<CardSkeleton chart lines={4} />}>
          <IndicatorsSection />
        </Suspense>
        <Suspense
          fallback={
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <CardSkeleton lines={2} className="lg:col-span-2" />
              <CardSkeleton chart />
              <CardSkeleton lines={6} className="lg:col-span-3" />
            </div>
          }
        >
          <PortfolioSection />
        </Suspense>
      </div>
    </>
  );
}

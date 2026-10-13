import type { Metadata } from "next";
import { Suspense } from "react";
import { CryptoSection } from "@/components/features/crypto/crypto-section";
import { PageHeader } from "@/components/ui/card";
import { CardSkeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Cripto" };

export default function CriptoPage() {
  return (
    <>
      <PageHeader title="Cripto" description="Binance: todos os ativos da conta (Spot + Earn), em R$ e US$." />
      <Suspense
        fallback={
          <div className="grid gap-4 lg:grid-cols-3">
            <CardSkeleton lines={2} className="lg:col-span-3" />
            <CardSkeleton lines={4} />
            <CardSkeleton lines={4} />
          </div>
        }
      >
        <CryptoSection />
      </Suspense>
    </>
  );
}

import { Landmark } from "lucide-react";
import { Donut } from "@/components/charts/donut";
import { AnimatedBRL } from "@/components/ui/animated-number";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { SourceBadge } from "@/components/ui/source-badge";
import { ASSET_CLASS_LABEL } from "@/domain/portfolio";
import { ASSET_CLASS_COLOR } from "@/lib/colors";
import { pctShort } from "@/lib/format";
import { getNetWorthView } from "@/server/services/overview";
import { worstSource } from "../shared";

export async function NetWorthSection({ className }: { className?: string }) {
  const { netWorth, sources, missing, fetchedAt } = await getNetWorthView();
  const source = worstSource(sources);
  const partial = missing.length > 0 && netWorth.total > 0;
  const data = netWorth.byClass.map((c) => ({
    name: ASSET_CLASS_LABEL[c.assetClass],
    value: c.value,
    color: ASSET_CLASS_COLOR[c.assetClass],
  }));

  return (
    <Card
      title="Patrimônio total"
      icon={<Landmark />}
      action={<SourceBadge sourced={{ source: partial ? "fallback" : source, fetchedAt }} label={partial ? "Parcial" : undefined} />}
      className={className}
    >
      <div className="grid items-center gap-6 sm:grid-cols-[1fr_200px]">
        <div>
          <AnimatedBRL value={netWorth.total} className="text-3xl font-semibold tracking-tight sm:text-4xl" />
          <p className="mt-1 text-xs text-ink-3">
            {partial ? `Sem dados de: ${missing.join(", ")}` : "Conta + investimentos + cripto"}
          </p>
          <ul className="mt-5 space-y-3">
            {netWorth.byClass.map((c) => (
              <li key={c.assetClass}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 text-ink-2">
                    <span className="size-2.5 rounded-sm" style={{ background: ASSET_CLASS_COLOR[c.assetClass] }} />
                    {ASSET_CLASS_LABEL[c.assetClass]}
                  </span>
                  <span className="flex items-baseline gap-2">
                    <Money value={c.value} className="font-medium" />
                    <span className="w-12 text-right text-xs text-ink-3 tabular-nums">{pctShort(c.weight)}</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full transition-[width] duration-1000 starting:w-0"
                    style={{ width: `${c.weight * 100}%`, background: ASSET_CLASS_COLOR[c.assetClass] }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
        {data.length > 0 && (
          <Donut
            data={data}
            size={200}
            center={
              <>
                <span className="text-[11px] text-ink-3">classes</span>
                <span className="text-xl font-semibold">{data.length}</span>
              </>
            }
          />
        )}
      </div>
    </Card>
  );
}

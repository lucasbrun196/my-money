import { AllocationBar } from "@/components/charts/allocation-bar";
import { AnimatedBRL } from "@/components/ui/animated-number";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { SourceBadge } from "@/components/ui/source-badge";
import { ASSET_CLASS_LABEL } from "@/domain/portfolio";
import { ASSET_CLASS_COLOR } from "@/lib/colors";
import { cn } from "@/lib/cn";
import { pctShort } from "@/lib/format";
import { getNetWorthView } from "@/server/services/overview";
import { Insight, worstSource } from "../shared";

export async function NetWorthSection({ className }: { className?: string }) {
  const { netWorth, sources, missing, fetchedAt } = await getNetWorthView();
  const source = worstSource(sources);
  const partial = missing.length > 0 && netWorth.total > 0;
  const classes = [...netWorth.byClass].sort((a, b) => b.value - a.value);
  const biggest = classes[0];

  return (
    <Card
      className={cn("flex flex-col", className)}
      action={<SourceBadge sourced={{ source: partial ? "fallback" : source, fetchedAt }} label={partial ? "Parcial" : undefined} />}
      title="Patrimônio total"
      subtitle={partial ? `Sem dados de: ${missing.join(", ")}` : "Conta, investimentos e cripto somados"}
    >
      <AnimatedBRL value={netWorth.total} className="text-[40px] font-semibold tracking-[-0.03em] sm:text-5xl" />

      {classes.length > 0 && (
        <div className="mt-6 flex flex-1 flex-col">
          <div className="min-h-24 flex-1">
            <AllocationBar
              tall
              segments={classes.map((c) => ({
              key: c.assetClass,
              label: ASSET_CLASS_LABEL[c.assetClass],
              value: c.value,
              color: ASSET_CLASS_COLOR[c.assetClass],
            }))}
            />
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
            {classes.map((c) => (
              <li key={c.assetClass} className="min-w-0">
                <p className="flex items-center gap-1.5 text-xs text-ink-3">
                  <span className="size-2 shrink-0 rounded-[2px]" style={{ background: ASSET_CLASS_COLOR[c.assetClass] }} />
                  <span className="truncate">{ASSET_CLASS_LABEL[c.assetClass]}</span>
                  <span className="tnum ml-auto font-mono text-[11px]">{pctShort(c.weight)}</span>
                </p>
                <Money value={c.value} className="mt-0.5 block text-[15px] font-medium" />
              </li>
            ))}
          </ul>
          {biggest && classes.length > 1 && (
            <Insight className="mt-5">
              A maior fatia é <span className="text-ink">{ASSET_CLASS_LABEL[biggest.assetClass].toLowerCase()}</span>, com{" "}
              <span className="text-ink">{pctShort(biggest.weight)}</span> do patrimônio.
            </Insight>
          )}
        </div>
      )}
    </Card>
  );
}

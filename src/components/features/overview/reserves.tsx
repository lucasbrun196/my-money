import { AnimatedBRL } from "@/components/ui/animated-number";
import { Card } from "@/components/ui/card";
import { Delta } from "@/components/ui/delta";
import { Money } from "@/components/ui/money";
import { SourceBadge, SourceNotes, Unavailable } from "@/components/ui/source-badge";
import type { ISODate } from "@/domain/types";
import { cn } from "@/lib/cn";
import { dateBR, dateShort, pctShort } from "@/lib/format";
import { getReservesView } from "@/server/services/overview";
import { Chip } from "../shared";

/** Liquidez da reserva: livre para resgate ou ainda em carência. */
function Liquidity({ liquidFrom, today }: { liquidFrom?: ISODate; today: ISODate }) {
  if (!liquidFrom) return null;
  return liquidFrom <= today ? (
    <Chip tone="good">Resgate livre</Chip>
  ) : (
    <Chip tone="warning">Carência até {dateShort(liquidFrom)}</Chip>
  );
}

/**
 * "Minhas reservas" do Santander. Nada fixo: a lista, os valores, as datas e a
 * taxa vêm das aplicações de renda fixa que o Open Finance traz do banco.
 */
export async function ReservesSection({ className }: { className?: string }) {
  const { summary, sourced, today } = await getReservesView();
  const { items, total, profit } = summary;

  return (
    <Card
      title="Minhas reservas"
      subtitle="Santander · aplicações vindas do Open Finance"
      action={<SourceBadge sourced={sourced} />}
      className={cn("flex flex-col", className)}
    >
      {items.length === 0 ? (
        sourced.source === "error" || sourced.source === "unconfigured" ? (
          <Unavailable sourced={sourced} what="as reservas" />
        ) : (
          <p className="text-sm text-ink-3">Nenhuma reserva encontrada no Santander pelo Open Finance.</p>
        )
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Total guardado</p>
              <AnimatedBRL value={total} className="mt-1.5 text-[32px] font-semibold tracking-[-0.03em]" />
            </div>
            <div className="text-right text-xs text-ink-3">
              <p>
                <span className="tnum font-mono text-sm text-ink">{items.length}</span>{" "}
                {items.length === 1 ? "reserva" : "reservas"}
              </p>
              <div className="mt-1">
                {profit == null ? (
                  "rendimento não informado"
                ) : Math.abs(profit) < 0.005 ? (
                  "sem rendimento ainda"
                ) : (
                  <Delta value={profit} size="xs" />
                )}
              </div>
            </div>
          </div>

          <ul className="mt-5 grid grid-cols-1 border-t border-line md:grid-cols-2 md:gap-x-8 lg:grid-cols-3">
            {items.map((r, i) => {
              const share = total > 0 ? r.value / total : 0;
              const meta = [
                r.purchaseDate && `aplicada em ${dateBR(r.purchaseDate)}`,
                r.rateLabel,
                r.dueDate && `vence ${dateBR(r.dueDate)}`,
              ].filter(Boolean);
              return (
                <li key={r.id} className="border-b border-line py-3">
                  <div className="flex items-center gap-3">
                    <span className="tnum grid size-8 shrink-0 place-items-center rounded-md border border-line font-mono text-xs text-ink-2">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" title={r.product}>
                        {r.label}
                      </p>
                      <p className="truncate text-[11px] text-ink-3">{meta.length ? meta.join(" · ") : r.product}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Money value={r.value} className="text-sm font-medium" />
                      <Liquidity liquidFrom={r.liquidFrom} today={today} />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 pl-11">
                    <div className="h-0.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                      <div
                        className="h-full rounded-full bg-ink-2 transition-[width] duration-[1200ms] ease-out-expo starting:w-0"
                        style={{ width: `${share * 100}%`, transitionDelay: `${200 + i * 80}ms` }}
                      />
                    </div>
                    <span className="tnum w-10 text-right font-mono text-[10.5px] text-ink-3">{pctShort(share)}</span>
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="mt-auto pt-4 text-[11px] leading-relaxed text-ink-3">
            O Open Finance não envia o nome que você dá a cada reserva no app do Santander, então elas aparecem
            numeradas pela data em que foram criadas.
          </p>
          <SourceNotes notes={sourced.source === "live" ? sourced.notes : undefined} />
        </>
      )}
    </Card>
  );
}

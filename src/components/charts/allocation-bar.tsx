import { cn } from "@/lib/cn";
import { pctShort } from "@/lib/format";

export type AllocationSegment = { key: string; label: string; value: number; color: string };

/**
 * Barra segmentada de composição (ex.: patrimônio por classe). Mais fácil de
 * comparar que uma rosca quando são poucas fatias; cada segmento cresce na
 * entrada, um depois do outro. No modo `tall`, a barra ocupa a altura
 * disponível e escreve a porcentagem dentro dos blocos que têm espaço.
 */
export function AllocationBar({
  segments,
  tall = false,
  className,
}: {
  segments: AllocationSegment[];
  tall?: boolean;
  className?: string;
}) {
  const total = segments.reduce((s, x) => s + Math.max(x.value, 0), 0);
  if (total <= 0) return null;
  return (
    <div
      className={cn("flex w-full gap-[3px]", tall ? "h-full min-h-20" : "h-3", className)}
      role="img"
      aria-label={segments.map((s) => `${s.label} ${pctShort(s.value / total)}`).join(", ")}
    >
      {segments.map((s, i) => {
        const share = Math.max(s.value, 0) / total;
        return (
          <div
            key={s.key}
            className={cn(
              "relative h-full origin-left overflow-hidden transition-transform duration-[900ms] ease-out-expo starting:scale-x-0",
              tall ? "@container rounded-md" : "rounded-[3px]",
            )}
            style={{
              flexGrow: share,
              flexBasis: 0,
              transitionDelay: `${150 + i * 90}ms`,
              ...(tall
                ? {
                    background: `linear-gradient(180deg, color-mix(in srgb, ${s.color} 30%, transparent), color-mix(in srgb, ${s.color} 8%, transparent))`,
                    boxShadow: `inset 0 2px 0 ${s.color}`,
                  }
                : { background: s.color }),
            }}
            title={`${s.label}: ${pctShort(share)}`}
          >
            {tall && (
              // O texto só aparece quando o bloco tem largura para ele (container query).
              <span className="absolute inset-x-2.5 bottom-2.5 hidden animate-fade text-ink [animation-delay:900ms] @min-[3.5rem]:block">
                <span className="tnum block font-mono text-[13px] leading-none font-medium">{pctShort(share)}</span>
                <span className="mt-1 hidden truncate text-[11px] leading-none text-ink-2 @min-[5.5rem]:block">{s.label}</span>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

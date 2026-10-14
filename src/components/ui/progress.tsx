import { cn } from "@/lib/cn";

/**
 * Barra de progresso animada. `marker` desenha um traço vertical (ex.: onde a
 * fatura deve fechar em relação à meta); `markerLabel` escreve o que o traço
 * significa logo acima dele.
 */
export function Progress({
  ratio,
  color = "var(--color-ink)",
  marker,
  markerLabel,
  className,
  label,
  size = "md",
}: {
  ratio: number;
  color?: string;
  marker?: number;
  markerLabel?: string;
  className?: string;
  label: string;
  size?: "sm" | "md" | "lg";
}) {
  const width = Math.max(0, Math.min(ratio, 1)) * 100;
  const showMarker = marker != null && marker > 0 && marker < 1;
  const height = size === "lg" ? "h-3" : size === "sm" ? "h-1" : "h-1.5";

  return (
    <div className={cn("relative", showMarker && markerLabel && "pt-5", className)}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ratio * 100)}
        className={cn("relative w-full overflow-hidden rounded-full bg-surface-3", height)}
      >
        <div
          className="h-full rounded-full transition-[width] duration-[1400ms] ease-out-expo starting:w-0"
          style={{ width: `${width}%`, background: color }}
        />
      </div>
      {showMarker && (
        <div
          className="pointer-events-none absolute inset-y-0 flex -translate-x-1/2 flex-col items-center"
          style={{ left: `${marker * 100}%` }}
          title={markerLabel}
        >
          {markerLabel && <span className="eyebrow mb-1 leading-none whitespace-nowrap text-ink-2">{markerLabel}</span>}
          <span className={cn("w-0.5 flex-1 rounded-full bg-ink", !markerLabel && "-my-1")} />
        </div>
      )}
    </div>
  );
}

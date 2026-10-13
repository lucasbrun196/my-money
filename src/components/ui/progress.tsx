import { cn } from "@/lib/cn";

/**
 * Barra de progresso animada. `marker` desenha um traço vertical (ex.: quanto
 * da quinzena já passou), para comparar ritmo de gasto × tempo.
 */
export function Progress({
  ratio,
  color = "var(--color-brand)",
  marker,
  className,
  label,
}: {
  ratio: number;
  color?: string;
  marker?: number;
  className?: string;
  label: string;
}) {
  const width = Math.max(0, Math.min(ratio, 1)) * 100;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio * 100)}
      className={cn("relative h-2.5 w-full overflow-hidden rounded-full bg-surface-3", className)}
    >
      <div
        className="h-full rounded-full transition-[width] duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] starting:w-0"
        style={{ width: `${width}%`, background: color }}
      />
      {marker != null && marker > 0 && marker < 1 && (
        <div
          className="absolute top-0 h-full w-0.5 bg-ink/70"
          style={{ left: `${marker * 100}%` }}
          title="Quanto da quinzena já passou"
        />
      )}
    </div>
  );
}

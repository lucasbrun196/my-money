import type { ReactNode } from "react";

/** Caixa padrão dos tooltips dos gráficos. */
export function TooltipBox({ title, children }: { title?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-w-32 rounded-lg border border-line-strong bg-surface-2/95 px-3 py-2 text-xs shadow-[0_12px_32px_-8px_rgb(0_0_0/0.8)] backdrop-blur-sm">
      {title && <div className="eyebrow mb-1">{title}</div>}
      {children}
    </div>
  );
}

/** Estilo comum dos eixos: texto pequeno, discreto, sem linhas. */
export const AXIS_TICK = { fill: "var(--color-ink-3)", fontSize: 10, fontFamily: "var(--font-mono)" } as const;
export const GRID_STROKE = "rgb(255 248 230 / 0.05)";

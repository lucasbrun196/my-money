import type { DataSourceStatus } from "@/domain/types";
import { cn } from "@/lib/cn";

const SEVERITY: DataSourceStatus[] = ["live", "demo", "fallback", "unconfigured", "error"];

/** A pior origem entre várias (para um card que junta dados de várias APIs). */
export function worstSource(sources: DataSourceStatus[]): DataSourceStatus {
  return sources.reduce((worst, s) => (SEVERITY.indexOf(s) > SEVERITY.indexOf(worst) ? s : worst), "live");
}

/** Linha "rótulo ........ valor", com pontilhado ligando os dois (estilo extrato). */
export function Row({ label, children, className }: { label: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-baseline gap-2 py-1.5 text-sm", className)}>
      <span className="shrink-0 text-ink-3">{label}</span>
      <span aria-hidden className="mb-1 min-w-4 flex-1 border-b border-dotted border-line-strong" />
      <span className="shrink-0 text-right text-ink">{children}</span>
    </div>
  );
}

export function Chip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "warning" | "info" }) {
  const tones = {
    neutral: "border-line-strong text-ink-2",
    good: "border-good/30 text-good",
    warning: "border-warning/35 text-warning",
    info: "border-series-1/40 text-series-1",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap", tones[tone])}>
      {children}
    </span>
  );
}

/** Frase-resumo de um painel: diz em palavras o que o número significa. */
export function Insight({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: "neutral" | "good" | "warning" | "bad"; className?: string }) {
  const bar = { neutral: "bg-ink-3", good: "bg-good", warning: "bg-warning", bad: "bg-critical" }[tone];
  return (
    <p className={cn("relative pl-3 text-[13px] leading-relaxed text-ink-2", className)}>
      <span aria-hidden className={cn("absolute top-1 bottom-1 left-0 w-0.5 rounded-full", bar)} />
      {children}
    </p>
  );
}

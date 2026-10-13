import type { DataSourceStatus } from "@/domain/types";

const SEVERITY: DataSourceStatus[] = ["live", "demo", "fallback", "unconfigured", "error"];

/** A pior origem entre várias (para um card que junta dados de várias APIs). */
export function worstSource(sources: DataSourceStatus[]): DataSourceStatus {
  return sources.reduce((worst, s) => (SEVERITY.indexOf(s) > SEVERITY.indexOf(worst) ? s : worst), "live");
}

export function Row({ label, children, className }: { label: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between gap-3 py-1.5 text-sm ${className ?? ""}`}>
      <span className="text-ink-3">{label}</span>
      <span className="text-right text-ink">{children}</span>
    </div>
  );
}

export function Chip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "warning" | "info" }) {
  const tones = {
    neutral: "bg-surface-3 text-ink-2",
    good: "bg-good/12 text-good",
    warning: "bg-warning/12 text-warning",
    info: "bg-series-1/15 text-series-1",
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}>{children}</span>;
}

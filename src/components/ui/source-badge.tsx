import { AlertTriangle, Info } from "lucide-react";
import type { DataSourceStatus, Sourced } from "@/domain/types";
import { dateTimeBR } from "@/lib/format";
import { cn } from "@/lib/cn";

const LABEL: Record<DataSourceStatus, string> = {
  live: "Ao vivo",
  demo: "Demo",
  fallback: "Config",
  unconfigured: "Não configurado",
  error: "Erro",
};

const DOT: Record<DataSourceStatus, string> = {
  live: "bg-good text-good/60 animate-pulse-dot",
  demo: "bg-series-7 text-series-7/50",
  fallback: "bg-warning text-warning/50",
  unconfigured: "bg-ink-3 text-ink-3/50",
  error: "bg-critical text-critical/50",
};

/** Selo "de onde veio este dado", com o horário da última busca no title. */
export function SourceBadge({
  sourced,
  label,
  className,
}: {
  sourced: Pick<Sourced<unknown>, "source" | "fetchedAt">;
  /** Texto alternativo (ex.: "Parcial" quando só parte das fontes respondeu). */
  label?: string;
  className?: string;
}) {
  return (
    <span
      title={`Atualizado em ${dateTimeBR(sourced.fetchedAt)}`}
      className={cn("inline-flex items-center gap-1.5 font-mono text-[10.5px] tracking-wide text-ink-3 uppercase", className)}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", DOT[sourced.source])} />
      {label ?? LABEL[sourced.source]}
    </span>
  );
}

/** Avisos da fonte de dados (ex.: fallback, conexão desatualizada). */
export function SourceNotes({ notes, tone = "info" }: { notes?: string[]; tone?: "info" | "error" }) {
  if (!notes?.length) return null;
  const Icon = tone === "error" ? AlertTriangle : Info;
  return (
    <ul
      className={cn(
        "mt-4 space-y-1 border-l-2 py-0.5 pl-3 text-xs",
        tone === "error" ? "border-critical/60 text-critical" : "border-line-strong text-ink-3",
      )}
    >
      {notes.map((n) => (
        <li key={n} className="flex gap-2">
          <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>{n}</span>
        </li>
      ))}
    </ul>
  );
}

/** Estado vazio para integrações sem dados (não configurada ou com erro). */
export function Unavailable({ sourced, what }: { sourced: Sourced<unknown>; what: string }) {
  const isError = sourced.source === "error";
  return (
    <div className="py-1">
      <p className="text-sm text-ink-2">
        {isError ? `Não foi possível carregar ${what} agora.` : `Integração ainda não configurada para ${what}.`}
      </p>
      <SourceNotes notes={sourced.notes} tone={isError ? "error" : "info"} />
    </div>
  );
}

import { AlertTriangle, CircleDot, Info } from "lucide-react";
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

const TONE: Record<DataSourceStatus, string> = {
  live: "text-brand bg-brand/10 border-brand/20",
  demo: "text-series-7 bg-series-7/10 border-series-7/25",
  fallback: "text-warning bg-warning/10 border-warning/20",
  unconfigured: "text-ink-3 bg-surface-3 border-line",
  error: "text-critical bg-critical/10 border-critical/25",
};

/** Selo "de onde veio este dado" — com horário da última busca no title. */
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
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        TONE[sourced.source],
        className,
      )}
    >
      <CircleDot className="size-3" aria-hidden />
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
        "mt-3 space-y-1 rounded-xl border px-3 py-2 text-xs",
        tone === "error" ? "border-critical/25 bg-critical/5 text-critical" : "border-line bg-surface-2 text-ink-3",
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
    <div className="py-2">
      <p className="text-sm text-ink-2">
        {isError ? `Não foi possível carregar ${what} agora.` : `Integração ainda não configurada para ${what}.`}
      </p>
      <SourceNotes notes={sourced.notes} tone={isError ? "error" : "info"} />
    </div>
  );
}

import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-md", className)} />;
}

/** Placeholder no formato de um card, exibido enquanto os dados chegam (streaming). */
export function CardSkeleton({ lines = 3, chart = false, className }: { lines?: number; chart?: boolean; className?: string }) {
  return (
    <div
      role="status"
      aria-label="Carregando"
      className={cn("rounded-2xl border border-line bg-surface/80 p-4 sm:p-5", className)}
    >
      <Skeleton className="mb-4 h-4 w-32" />
      <Skeleton className="mb-3 h-8 w-44" />
      {chart && <Skeleton className="mb-3 h-36 w-full rounded-xl" />}
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("mb-2 h-3", i % 2 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

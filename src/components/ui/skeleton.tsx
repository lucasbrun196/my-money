import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-md", className)} />;
}

/** Placeholder no formato de um card, exibido enquanto os dados chegam (streaming). */
export function CardSkeleton({ lines = 3, chart = false, className }: { lines?: number; chart?: boolean; className?: string }) {
  return (
    <div role="status" aria-label="Carregando" className={cn("panel animate-fade p-4 sm:p-5", className)}>
      <Skeleton className="mb-5 h-3 w-28" />
      <Skeleton className="mb-1.5 h-2.5 w-16" />
      <Skeleton className="mb-5 h-8 w-48" />
      {chart && <Skeleton className="mb-4 h-36 w-full rounded-lg" />}
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-1.5">
          <Skeleton className={cn("h-2.5", i % 2 ? "w-1/3" : "w-1/2")} />
          <Skeleton className="h-2.5 w-16" />
        </div>
      ))}
    </div>
  );
}

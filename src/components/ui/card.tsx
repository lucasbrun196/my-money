import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({
  title,
  subtitle,
  action,
  children,
  className,
  as: Tag = "section",
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
}) {
  return (
    <Tag className={cn("panel animate-rise p-4 sm:p-5", className)}>
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="truncate text-[13px] font-medium text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 truncate text-xs text-ink-3">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      {children}
    </Tag>
  );
}

/** Rótulo + valor grande: o "número principal" de um painel. */
export function Figure({
  label,
  children,
  hint,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="eyebrow">{label}</p>
      <div className="mt-1.5">{children}</div>
      {hint && <div className="mt-1 text-xs text-ink-3">{hint}</div>}
    </div>
  );
}

export function PageHeader({ title, description, kicker }: { title: string; description?: ReactNode; kicker?: string }) {
  return (
    <div className="mb-6 animate-fade sm:mb-8">
      {kicker && <p className="eyebrow mb-2">{kicker}</p>}
      <h1 className="text-2xl font-semibold tracking-[-0.02em] sm:text-[28px]">{title}</h1>
      {description && <p className="mt-1.5 max-w-xl text-sm text-ink-3">{description}</p>}
    </div>
  );
}

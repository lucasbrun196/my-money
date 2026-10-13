import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({
  title,
  subtitle,
  icon,
  action,
  children,
  className,
  delay = 0,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Atraso da animação de entrada (ms), para efeito em cascata. */
  delay?: number;
}) {
  return (
    <section
      className={cn(
        "animate-fade-up rounded-2xl border border-line bg-surface/80 p-4 shadow-[0_1px_0_rgb(255_255_255/0.03)_inset] backdrop-blur sm:p-5",
        className,
      )}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {(title || action) && (
        <header className="mb-3 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {icon && <span className="text-ink-3 [&>svg]:size-4">{icon}</span>}
            <div className="min-w-0">
              {title && <h2 className="truncate text-sm font-medium text-ink-2">{title}</h2>}
              {subtitle && <p className="truncate text-xs text-ink-3">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div className="mb-4 sm:mb-6">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
      {description && <p className="mt-1 text-sm text-ink-3">{description}</p>}
    </div>
  );
}

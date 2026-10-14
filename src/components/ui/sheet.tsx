"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Painel modal: sobe de baixo no celular e fica centralizado no desktop.
 * Usa <dialog> nativo (Esc fecha, foco preso no painel).
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // clique no fundo escuro
      }}
      className="m-0 mt-auto max-h-[88dvh] w-full max-w-none overflow-hidden rounded-t-[20px] border border-line-strong bg-surface p-0 text-ink shadow-[0_-24px_60px_-20px_rgb(0_0_0/0.9)] backdrop:bg-black/70 open:animate-[sheet-up_0.45s_var(--ease-out-expo)] open:backdrop:animate-fade sm:m-auto sm:max-h-[80dvh] sm:max-w-lg sm:rounded-[18px]"
    >
      <div className="flex max-h-[inherit] flex-col">
        <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-line-strong sm:hidden" aria-hidden />
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 pt-4 pb-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight first-letter:uppercase">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-ink-3">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="thin-scroll overflow-y-auto px-5 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </dialog>
  );
}

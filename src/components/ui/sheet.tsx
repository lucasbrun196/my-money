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
      className="m-0 mt-auto max-h-[88dvh] w-full max-w-none overflow-hidden rounded-t-3xl border border-line-strong bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm open:animate-[sheet-up_0.35s_cubic-bezier(0.22,1,0.36,1)] sm:m-auto sm:max-h-[80dvh] sm:max-w-lg sm:rounded-3xl"
    >
      <div className="flex max-h-[inherit] flex-col">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line-strong sm:hidden" aria-hidden />
        <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold first-letter:uppercase">{title}</h2>
            {subtitle && <p className="text-xs text-ink-3">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid size-9 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="overflow-y-auto px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </dialog>
  );
}

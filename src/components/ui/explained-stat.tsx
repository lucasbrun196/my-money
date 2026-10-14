"use client";

import { Info } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { explain } from "@/lib/glossary";

const POPOVER_WIDTH = 300;

/**
 * Caixinha "rótulo + valor" com explicação: abre ao passar o mouse (desktop)
 * ou ao tocar (celular); fecha ao sair, ao tocar fora ou com Esc.
 */
export function ExplainedStat({ label, value }: { label: string; value: string }) {
  const info = explain(label);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const pointer = useRef<string>("mouse");
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);

  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    // Perto da borda direita da tela, o balão abre para a esquerda.
    if (r) setAlignRight(r.left + POPOVER_WIDTH > window.innerWidth - 16);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!info) {
    return (
      <div className="rounded-lg border border-line px-3 py-2.5">
        <p className="eyebrow">{label}</p>
        <p className="money mt-1 text-sm font-medium">{value}</p>
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("relative", open && "z-30")}>
      <button
        type="button"
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onPointerDown={(e) => {
          pointer.current = e.pointerType;
        }}
        onPointerEnter={(e) => e.pointerType === "mouse" && show()}
        onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
        onClick={() => {
          // No mouse o hover já abre; no toque (e no teclado) o clique alterna.
          if (pointer.current === "mouse" && open) return;
          if (open) setOpen(false);
          else show();
        }}
        className={cn(
          "w-full cursor-help rounded-lg border px-3 py-2.5 text-left transition-colors duration-200",
          open ? "border-ink-3 bg-surface-2" : "border-line hover:border-line-strong",
        )}
      >
        <span className="eyebrow flex items-start justify-between gap-2">
          <span className="leading-snug">{label}</span>
          <Info className={cn("size-3.5 shrink-0 transition-colors", open ? "text-ink" : "text-ink-3")} aria-hidden />
        </span>
        <span className="money mt-1 block text-sm font-medium">{value}</span>
      </button>

      {open && (
        <div
          id={id}
          role="tooltip"
          className={cn(
            "absolute top-full mt-2 max-w-[calc(100vw-2rem)] animate-pop rounded-lg border border-line-strong bg-surface-2 p-3.5 shadow-[0_16px_40px_-12px_rgb(0_0_0/0.9)]",
            alignRight ? "right-0 origin-top-right" : "left-0 origin-top-left",
          )}
          style={{ width: POPOVER_WIDTH }}
        >
          <p className="text-[13px] font-medium text-ink">{label}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-2">{info.what}</p>
          <p className="eyebrow mt-3">Na prática</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-2">{info.impact}</p>
        </div>
      )}
    </div>
  );
}

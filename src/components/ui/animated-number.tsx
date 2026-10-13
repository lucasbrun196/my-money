"use client";

import { useEffect, useRef, useState } from "react";
import { brl } from "@/lib/format";

/**
 * Valor em R$ que chega pronto do servidor (sem "piscar" R$ 0,00) e, quando
 * muda depois (ex.: botão Atualizar), conta suavemente do valor antigo ao novo.
 */
export function AnimatedBRL({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(value);
  const shown = useRef(value);

  useEffect(() => {
    const start = shown.current;
    if (start === value) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduce || document.hidden ? 0 : 800;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = duration === 0 ? 1 : Math.min((t - t0) / duration, 1);
      const current = start + (value - start) * (1 - Math.pow(1 - p, 3));
      shown.current = current;
      setDisplay(current);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <span className={`money inline-block animate-fade-up ${className ?? ""}`}>{brl(display)}</span>;
}

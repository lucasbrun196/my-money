"use client";

import { useEffect } from "react";

/**
 * Brilho de borda que segue o cursor nos painéis (só em telas com mouse).
 * Um único listener no documento atualiza --mx/--my do painel sob o cursor.
 */
export function PanelGlow() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover)").matches) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const panel = (e.target as Element | null)?.closest?.<HTMLElement>(".panel");
        if (!panel) return;
        const r = panel.getBoundingClientRect();
        panel.style.setProperty("--mx", `${e.clientX - r.left}px`);
        panel.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", onMove);
    };
  }, []);
  return null;
}

/** Marca: três barras crescentes dentro de um quadrado, desenhadas à mão em SVG. */
export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect x="0.5" y="0.5" width="31" height="31" rx="8" fill="var(--color-ink)" />
      <rect x="8" y="17" width="4" height="7" rx="1" fill="var(--color-bg)" />
      <rect x="14" y="12.5" width="4" height="11.5" rx="1" fill="var(--color-bg)" />
      <rect x="20" y="8" width="4" height="16" rx="1" fill="var(--color-bg)" opacity="0.55" />
    </svg>
  );
}

export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark className={size === "lg" ? "size-10" : "size-7"} />
      <span className={size === "lg" ? "text-2xl font-semibold tracking-[-0.03em]" : "text-[15px] font-semibold tracking-[-0.02em]"}>
        mymoney
      </span>
    </span>
  );
}

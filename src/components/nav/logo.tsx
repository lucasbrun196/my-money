export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const box = size === "lg" ? "size-11 text-lg" : "size-8 text-sm";
  return (
    <span className="flex items-center gap-2.5">
      <span
        className={`${box} grid place-items-center rounded-xl bg-linear-to-br from-brand to-brand-2 font-bold text-bg shadow-[0_6px_24px_-6px_rgb(52_211_153/0.55)]`}
        aria-hidden
      >
        M
      </span>
      <span className={size === "lg" ? "text-2xl font-semibold tracking-tight" : "text-base font-semibold tracking-tight"}>
        My<span className="text-brand">Money</span>
      </span>
    </span>
  );
}

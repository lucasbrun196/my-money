import { TrendingDown, TrendingUp } from "lucide-react";
import { signedBrl, signedPct, signedUsd } from "@/lib/format";
import { cn } from "@/lib/cn";

/** Resultado (lucro/prejuízo): cor + ícone + sinal — nunca só a cor. */
export function Delta({
  value,
  pct,
  currency = "BRL",
  className,
  size = "sm",
}: {
  value?: number | null;
  pct?: number | null;
  currency?: "BRL" | "USD";
  className?: string;
  size?: "xs" | "sm";
}) {
  const ref = value ?? pct ?? 0;
  const up = ref >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium tabular-nums",
        size === "xs" ? "text-xs" : "text-sm",
        up ? "text-pos" : "text-neg",
        className,
      )}
    >
      <Icon className={size === "xs" ? "size-3" : "size-3.5"} aria-hidden />
      {value != null && (
        <span className="money">{currency === "USD" ? signedUsd(value) : signedBrl(value)}</span>
      )}
      {pct != null && <span>{value != null ? `(${signedPct(pct)})` : signedPct(pct)}</span>}
    </span>
  );
}

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { signedBrl, signedPct, signedUsd } from "@/lib/format";
import { cn } from "@/lib/cn";

/** Resultado (lucro/prejuízo): cor + ícone + sinal, nunca só a cor. */
export function Delta({
  value,
  pct,
  currency = "BRL",
  className,
  size = "sm",
  invert = false,
}: {
  value?: number | null;
  pct?: number | null;
  currency?: "BRL" | "USD";
  className?: string;
  size?: "xs" | "sm";
  /** Para gastos: subir é ruim (vermelho) e cair é bom (verde). */
  invert?: boolean;
}) {
  const ref = value ?? pct ?? 0;
  const up = ref >= 0;
  const good = invert ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium tabular-nums",
        size === "xs" ? "text-xs" : "text-sm",
        good ? "text-pos" : "text-neg",
        className,
      )}
    >
      <span
        className={cn(
          "grid place-items-center rounded-full",
          good ? "bg-pos/12" : "bg-neg/12",
          size === "xs" ? "size-4" : "size-5",
        )}
      >
        <Icon className={size === "xs" ? "size-3" : "size-3.5"} aria-hidden />
      </span>
      {value != null && (
        <span className="money">{currency === "USD" ? signedUsd(value) : signedBrl(value)}</span>
      )}
      {pct != null && <span>{value != null ? `(${signedPct(pct)})` : signedPct(pct)}</span>}
    </span>
  );
}

import { brl, signedBrl, signedUsd, usd } from "@/lib/format";
import { cn } from "@/lib/cn";

/** Valor monetário formatado; a classe `money` permite borrar no modo privacidade. */
export function Money({
  value,
  currency = "BRL",
  signed = false,
  className,
}: {
  value: number;
  currency?: "BRL" | "USD";
  signed?: boolean;
  className?: string;
}) {
  const text =
    currency === "USD" ? (signed ? signedUsd(value) : usd(value)) : signed ? signedBrl(value) : brl(value);
  return <span className={cn("money whitespace-nowrap", className)}>{text}</span>;
}

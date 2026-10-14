import type { CSSProperties } from "react";
import { brl, usd } from "@/lib/format";
import { cn } from "@/lib/cn";

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * Dígitos em "odômetro": cada um é uma coluna 0–9 que rola até o valor.
 * Funciona só com CSS (@starting-style), então o número chega pronto do
 * servidor e anima na entrada e quando muda (ex.: botão Atualizar).
 * As chaves contam da direita, para cada casa manter a identidade ao mudar.
 */
function Rolling({ text }: { text: string }) {
  const chars = [...text];
  return (
    <>
      {chars.map((c, i) => {
        const fromEnd = chars.length - i;
        if (c < "0" || c > "9") return <span key={`s${fromEnd}`}>{c}</span>;
        return (
          <span key={`d${fromEnd}`} className="odo-digit">
            <span className="odo-strip" style={{ "--d": Number(c), "--i": i } as CSSProperties}>
              {DIGITS.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </span>
          </span>
        );
      })}
    </>
  );
}

/**
 * Valor monetário de destaque: símbolo pequeno, inteiros grandes rolando
 * e centavos discretos. Leitores de tela recebem o valor completo.
 */
export function AnimatedBRL({
  value,
  className,
  currency = "BRL",
}: {
  value: number;
  className?: string;
  currency?: "BRL" | "USD";
}) {
  const text = currency === "USD" ? usd(value) : brl(value);
  const m = text.match(/^([^\d]*?)\s*([\d.]+)(,\d+)?$/);
  if (!m) return <span className={cn("money", className)}>{text}</span>;
  const [, prefix, int, cents] = m;

  return (
    <span className={cn("money inline-block", className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="odo">
        <span className="mr-[0.22em] self-start pt-[0.28em] text-[0.42em] font-medium tracking-normal text-ink-3">
          {prefix}
        </span>
        <Rolling text={int} />
        {cents && (
          <span className="odo text-[0.55em] text-ink-3">
            <Rolling text={cents} />
          </span>
        )}
      </span>
    </span>
  );
}

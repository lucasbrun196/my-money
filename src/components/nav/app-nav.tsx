"use client";

import { Bitcoin, ChartLine, CreditCard, House, ReceiptText } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/", label: "Início", long: "Visão geral", icon: House },
  { href: "/gastos", label: "Gastos", long: "Gastos", icon: ReceiptText },
  { href: "/cartao", label: "Cartão", long: "Cartão de crédito", icon: CreditCard },
  { href: "/investimentos", label: "Investir", long: "Investimentos", icon: ChartLine },
  { href: "/cripto", label: "Cripto", long: "Cripto", icon: Bitcoin },
] as const;

function useActiveIndex() {
  const pathname = usePathname();
  return ITEMS.findIndex(({ href }) => (href === "/" ? pathname === "/" : pathname.startsWith(href)));
}

/** Barra inferior fixa (celular). Um traço desliza até a aba ativa. */
export function BottomNav() {
  const active = useActiveIndex();
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/92 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="relative mx-auto max-w-lg">
        {active >= 0 && (
          <span
            aria-hidden
            className="absolute -top-px left-0 flex w-1/5 justify-center transition-transform duration-500 ease-out-expo"
            style={{ transform: `translateX(${active * 100}%)` }}
          >
            <span className="h-0.5 w-8 rounded-full bg-ink" />
          </span>
        )}
        <ul className="grid grid-cols-5">
          {ITEMS.map(({ href, label, icon: Icon }, i) => {
            const on = i === active;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-1 pt-2.5 pb-2 text-[10.5px] font-medium transition-colors duration-300 active:scale-95",
                    on ? "text-ink" : "text-ink-3",
                  )}
                >
                  <Icon className={cn("size-5 transition-transform duration-300", on && "-translate-y-px")} strokeWidth={on ? 2.1 : 1.7} aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

const SIDE_ITEM = 40; // altura de cada item (px)
const SIDE_GAP = 2;

/** Menu lateral (desktop). Um fundo desliza até o item ativo. */
export function SideNav() {
  const active = useActiveIndex();
  return (
    <nav aria-label="Navegação principal" className="relative">
      {active >= 0 && (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 rounded-lg border border-line bg-surface-2 transition-transform duration-500 ease-out-expo"
          style={{ height: SIDE_ITEM, transform: `translateY(${active * (SIDE_ITEM + SIDE_GAP)}px)` }}
        />
      )}
      <ul className="relative flex flex-col" style={{ gap: SIDE_GAP }}>
        {ITEMS.map(({ href, long, icon: Icon }, i) => {
          const on = i === active;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={on ? "page" : undefined}
                style={{ height: SIDE_ITEM }}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 text-sm transition-colors duration-300",
                  on ? "font-medium text-ink" : "text-ink-3 hover:text-ink-2",
                )}
              >
                <Icon
                  className="size-4 transition-transform duration-300 group-hover:scale-110"
                  strokeWidth={on ? 2.1 : 1.7}
                  aria-hidden
                />
                {long}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

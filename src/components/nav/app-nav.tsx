"use client";

import { Bitcoin, ChartLine, CreditCard, House, ReceiptText } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/", label: "Início", icon: House },
  { href: "/gastos", label: "Gastos", icon: ReceiptText },
  { href: "/cartao", label: "Cartão", icon: CreditCard },
  { href: "/investimentos", label: "Investir", icon: ChartLine },
  { href: "/cripto", label: "Cripto", icon: Bitcoin },
] as const;

function useActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

/** Barra inferior fixa (celular). */
export function BottomNav() {
  const isActive = useActive();
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/85 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-brand" : "text-ink-3 active:text-ink-2",
                )}
              >
                <span
                  className={cn(
                    "grid h-7 w-12 place-items-center rounded-full transition-all duration-300",
                    active && "bg-brand/12",
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Menu lateral (desktop). */
export function SideNav() {
  const isActive = useActive();
  return (
    <nav aria-label="Navegação principal" className="flex flex-col gap-1">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-brand/10 text-brand" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
            )}
          >
            <Icon className="size-4.5" aria-hidden />
            {label === "Investir" ? "Investimentos" : label}
          </Link>
        );
      })}
    </nav>
  );
}

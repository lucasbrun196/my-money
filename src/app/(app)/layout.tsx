import type { ReactNode } from "react";
import Link from "next/link";
import { BottomNav, SideNav } from "@/components/nav/app-nav";
import { LogoutButton, PrivacyToggle, RefreshButton } from "@/components/nav/header-actions";
import { Logo } from "@/components/nav/logo";

/**
 * Casca do app: estática (entra no "static shell" e aparece na hora);
 * os dados de cada página chegam depois via streaming, seção por seção.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line px-4 py-6 lg:flex">
        <Link href="/" className="mb-8 px-2">
          <Logo />
        </Link>
        <SideNav />
        <div className="mt-auto flex items-center gap-1 px-1">
          <PrivacyToggle />
          <RefreshButton />
          <LogoutButton />
        </div>
      </aside>

      <div className="min-w-0">
        <header
          className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-xl lg:hidden"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
            <Link href="/">
              <Logo />
            </Link>
            <div className="flex items-center">
              <PrivacyToggle />
              <RefreshButton />
              <LogoutButton />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 pt-5 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-12">{children}</main>
      </div>

      <BottomNav />
    </div>
  );
}

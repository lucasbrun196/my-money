import type { ReactNode } from "react";
import Link from "next/link";
import { BottomNav, SideNav } from "@/components/nav/app-nav";
import { LogoutButton, PrivacyToggle, RefreshButton } from "@/components/nav/header-actions";
import { Logo } from "@/components/nav/logo";
import { PanelGlow } from "@/components/ui/panel-glow";

/**
 * Casca do app: estática (entra no "static shell" e aparece na hora);
 * os dados de cada página chegam depois via streaming, seção por seção.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[232px_1fr]">
      <PanelGlow />
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line px-3 py-6 lg:flex">
        <Link href="/" className="mb-10 px-3">
          <Logo />
        </Link>
        <p className="eyebrow mb-2 px-3">Painel</p>
        <SideNav />
        <div className="mt-auto border-t border-line px-1 pt-4">
          <div className="flex items-center gap-1">
            <PrivacyToggle />
            <RefreshButton />
            <LogoutButton />
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header
          className="sticky top-0 z-30 border-b border-line bg-bg/92 backdrop-blur-md lg:hidden"
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

        <main className="mx-auto max-w-6xl px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-12 lg:pb-16">{children}</main>
      </div>

      <BottomNav />
    </div>
  );
}

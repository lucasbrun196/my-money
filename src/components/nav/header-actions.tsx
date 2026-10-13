"use client";

import { Eye, EyeOff, LogOut, RefreshCw } from "lucide-react";
import { useSyncExternalStore, useTransition } from "react";
import { logout, refreshData } from "@/app/(app)/actions";
import { cn } from "@/lib/cn";
import { PRIVACY_EVENT, PRIVACY_KEY } from "@/lib/privacy";

// O atributo data-privacy é aplicado antes da pintura por um script no layout raiz.
const subscribe = (cb: () => void) => {
  window.addEventListener(PRIVACY_EVENT, cb);
  return () => window.removeEventListener(PRIVACY_EVENT, cb);
};
const getSnapshot = () => document.documentElement.dataset.privacy === "on";
const getServerSnapshot = () => false;

/** Botão "olho": borra todos os valores (útil para abrir o app em público). */
export function PrivacyToggle() {
  const on = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = () => {
    const next = on ? "off" : "on";
    document.documentElement.dataset.privacy = next;
    try {
      localStorage.setItem(PRIVACY_KEY, next);
    } catch {}
    window.dispatchEvent(new Event(PRIVACY_EVENT));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "Mostrar valores" : "Ocultar valores"}
      className="grid size-9 place-items-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
    >
      {on ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
    </button>
  );
}

/** Invalida o cache das APIs e recarrega a página com dados novos. */
export function RefreshButton() {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => start(() => refreshData())}
      disabled={pending}
      aria-label="Atualizar dados"
      title="Buscar dados novos nas APIs"
      className="grid size-9 place-items-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-60"
    >
      <RefreshCw className={cn("size-4.5", pending && "animate-spin")} />
    </button>
  );
}

export function LogoutButton({ withLabel = false }: { withLabel?: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => start(() => logout())}
      disabled={pending}
      aria-label="Sair"
      className={cn(
        "flex items-center gap-2 rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink",
        withLabel ? "px-3 py-2 text-sm" : "size-9 justify-center",
      )}
    >
      <LogOut className="size-4.5" />
      {withLabel && "Sair"}
    </button>
  );
}


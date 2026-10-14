"use client";

import { Lock } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm() {
  const next = useSearchParams().get("next") ?? "/";
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="eyebrow mb-2 block">Senha</span>
        <span className="relative block">
          <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            autoFocus
            className="w-full rounded-lg border border-line-strong bg-surface-2 py-3 pr-3 pl-10 text-base text-ink outline-none transition focus:border-ink-2 focus:ring-4 focus:ring-ink/8"
            aria-invalid={Boolean(state.error)}
            aria-describedby={state.error ? "login-error" : undefined}
          />
        </span>
      </label>

      {state.error && (
        <p id="login-error" role="alert" className="text-sm text-critical">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-ink py-3 text-sm font-semibold text-bg transition hover:opacity-90 active:scale-[0.99] disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}

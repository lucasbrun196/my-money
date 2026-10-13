"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifyPassword } from "@/server/auth/password";
import { createSessionToken, SESSION_COOKIE } from "@/server/auth/token";
import { env } from "@/server/env";

export type LoginState = { error?: string };

// Limite simples de tentativas por IP (em memória, por instância do servidor).
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60_000;
const failures = new Map<string, { count: number; first: number }>();

/** Só aceita caminhos internos ("/gastos"), nunca "//site.com" ou URLs absolutas. */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "/";
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!env.auth.passwordHash || !env.auth.secret) {
    return { error: "Login não configurado: defina AUTH_PASSWORD_HASH e AUTH_SECRET (rode npm run setup:auth)." };
  }

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const entry = failures.get(ip);
  if (entry && now - entry.first < WINDOW_MS && entry.count >= MAX_FAILURES) {
    return { error: "Muitas tentativas. Aguarde alguns minutos e tente de novo." };
  }

  const password = String(formData.get("password") ?? "");
  const ok = password.length > 0 && (await verifyPassword(password, env.auth.passwordHash));

  if (!ok) {
    const fresh = !entry || now - entry.first >= WINDOW_MS;
    failures.set(ip, { count: fresh ? 1 : entry.count + 1, first: fresh ? now : entry.first });
    await new Promise((r) => setTimeout(r, 800)); // atrasa tentativas de força bruta
    return { error: "Senha incorreta." };
  }

  failures.delete(ip);
  const days = env.auth.sessionDays;
  (await cookies()).set(SESSION_COOKIE, await createSessionToken(days), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: days * 24 * 60 * 60,
  });
  redirect(safeNext(formData.get("next")));
}

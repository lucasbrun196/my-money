import type { Metadata } from "next";
import { Suspense } from "react";
import { Logo } from "@/components/nav/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>
        <div className="rounded-2xl border border-line bg-surface/80 p-6 backdrop-blur">
          <h1 className="mb-1 text-lg font-semibold">Bem-vindo de volta</h1>
          <p className="mb-6 text-sm text-ink-3">Painel pessoal. Digite sua senha para continuar.</p>
          <Suspense fallback={<div className="h-40" />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

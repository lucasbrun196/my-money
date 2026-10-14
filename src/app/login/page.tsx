import type { Metadata } from "next";
import { Suspense } from "react";
import { Logo } from "@/components/nav/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-[360px]">
        <div className="mb-10 animate-rise">
          <Logo size="lg" />
        </div>
        <div className="panel animate-rise p-6 [animation-delay:80ms]">
          <h1 className="text-lg font-semibold tracking-tight">Entrar</h1>
          <p className="mt-1 mb-6 text-sm text-ink-3">Painel pessoal. Digite sua senha para continuar.</p>
          <Suspense fallback={<div className="h-40" />}>
            <LoginForm />
          </Suspense>
        </div>
        <p className="eyebrow mt-6 animate-fade text-center [animation-delay:300ms]">Acesso restrito</p>
      </div>
    </main>
  );
}

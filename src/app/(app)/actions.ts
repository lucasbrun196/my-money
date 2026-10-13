"use server";

import { refresh, updateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/dal";
import { SESSION_COOKIE } from "@/server/auth/token";
import { ALL_CACHE_TAGS } from "@/server/cache-tags";

/** Botão "Atualizar": expira o cache de todas as APIs e redesenha a página. */
export async function refreshData() {
  await requireSession();
  for (const tag of ALL_CACHE_TAGS) updateTag(tag);
  refresh();
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { SESSION_COOKIE, verifySessionToken } from "./token";

/**
 * Data Access Layer: toda função que lê dados financeiros chama isto antes.
 * O proxy já bloqueia quem não está logado, mas verificar perto do dado é a
 * defesa em profundidade recomendada (o proxy pode ser contornado por bugs).
 * `cache` do React evita verificar o JWT mais de uma vez por requisição.
 */
export const requireSession = cache(async (): Promise<void> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifySessionToken(token))) redirect("/login");
});

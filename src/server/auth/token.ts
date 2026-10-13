/**
 * Token de sessão (JWT HS256 assinado com AUTH_SECRET).
 * Sem dependências do Next para poder ser usado tanto no proxy quanto nas
 * Server Actions/Server Components.
 */
import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "mm_session";
const ISSUER = "mymoney";

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET ausente ou curto demais (mínimo 32 caracteres). Rode: npm run setup:auth");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(days: number): Promise<string> {
  return new SignJWT({ role: "owner" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setSubject("owner")
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, secretKey(), { issuer: ISSUER, algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

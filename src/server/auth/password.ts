import "server-only";
import { scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * Formato do hash (gerado por `npm run setup:auth`):
 *   scrypt:<N>:<r>:<p>:<salt base64url>:<hash base64url>
 * Usamos ":" e não "$" porque o Next expande "$VAR" dentro dos arquivos .env.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, saltB64, hashB64] = stored.split(":");
  if (algo !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64url");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64url"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: 256 * 1024 * 1024,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

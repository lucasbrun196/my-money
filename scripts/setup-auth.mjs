#!/usr/bin/env node
/**
 * Gera as variáveis de login do MyMoney:
 *   AUTH_SECRET         → chave aleatória que assina o cookie de sessão
 *   AUTH_PASSWORD_HASH  → hash scrypt da sua senha (a senha nunca é salva)
 *
 * Uso:  npm run setup:auth
 * Cole as duas linhas no .env.local (local) e nas Environment Variables da Vercel.
 */
import { randomBytes, scryptSync } from "node:crypto";
import readline from "node:readline";

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => {
      if (s.includes(question)) rl.output.write(s);
      else rl.output.write("*");
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

const password = process.argv[2] ?? (await askHidden("Escolha a senha do MyMoney: "));
if (!password || password.length < 10) {
  console.error("Use uma senha com pelo menos 10 caracteres.");
  process.exit(1);
}
if (!process.argv[2]) {
  const confirm = await askHidden("Confirme a senha: ");
  if (confirm !== password) {
    console.error("As senhas não conferem.");
    process.exit(1);
  }
}

const N = 32768, r = 8, p = 1;
const salt = randomBytes(16);
const hash = scryptSync(password, salt, 32, { N, r, p, maxmem: 256 * 1024 * 1024 });

console.log("\nAdicione ao .env.local e à Vercel:\n");
console.log(`AUTH_SECRET=${randomBytes(48).toString("base64url")}`);
console.log(`AUTH_PASSWORD_HASH=scrypt:${N}:${r}:${p}:${salt.toString("base64url")}:${hash.toString("base64url")}`);
console.log("\nTrocar a AUTH_SECRET desloga todas as sessões abertas.");

#!/usr/bin/env node
/**
 * Diagnóstico da API Key da Binance. Uso: npm run check:binance
 *
 * Confere as permissões da key (precisa ser SOMENTE LEITURA) e mostra todos
 * os saldos em Spot e Simple Earn.
 */
import { createHmac } from "node:crypto";

const BASE = process.env.BINANCE_API_BASE ?? "https://api.binance.com";
const { BINANCE_API_KEY: key, BINANCE_API_SECRET: secret } = process.env;

if (!key || !secret) {
  console.error("Defina BINANCE_API_KEY e BINANCE_API_SECRET no .env.local");
  process.exit(1);
}

async function signed(path, params = {}) {
  const query = new URLSearchParams({ ...params, recvWindow: "10000", timestamp: String(Date.now()) }).toString();
  const signature = createHmac("sha256", secret).update(query).digest("hex");
  const res = await fetch(`${BASE}${path}?${query}&signature=${signature}`, { headers: { "X-MBX-APIKEY": key } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}: ${body.msg ?? JSON.stringify(body)}`);
  return body;
}

const r = await signed("/sapi/v1/account/apiRestrictions");
console.log("Permissões da API Key:");
console.log(`  leitura ............ ${r.enableReading ? "✓" : "✗"}`);
console.log(`  spot/margin trade .. ${r.enableSpotAndMarginTrading ? "⚠ HABILITADO" : "desligado ✓"}`);
console.log(`  saque .............. ${r.enableWithdrawals ? "⚠ HABILITADO" : "desligado ✓"}`);
console.log(`  futuros ............ ${r.enableFutures ? "⚠ HABILITADO" : "desligado ✓"}`);
console.log(`  transferência univ.  ${r.permitsUniversalTransfer ? "⚠ HABILITADO" : "desligado ✓"}`);
console.log(`  restrição de IP .... ${r.ipRestrict ? "sim" : "não"}`);

if (r.enableSpotAndMarginTrading || r.enableWithdrawals || r.enableFutures || r.permitsUniversalTransfer) {
  console.error("\n⚠ Esta key pode movimentar dinheiro. Apague-a e crie outra só com 'Enable Reading'.");
  process.exitCode = 2;
}

const account = await signed("/api/v3/account", { omitZeroBalances: "true" });
const flexible = await signed("/sapi/v1/simple-earn/flexible/position", { size: "100" });
// O Earn flexível aparece no Spot como "LDBTC", "LDSOL"...: ignora para não duplicar.
const mirrors = new Set(flexible.rows.map((r) => `LD${r.asset}`));
const assets = new Set([
  ...account.balances.map((b) => b.asset).filter((a) => !mirrors.has(a)),
  ...flexible.rows.map((r) => r.asset),
]);
console.log("\nSaldos (Spot + Earn flexível):");
for (const asset of [...assets].sort()) {
  const spot = account.balances.filter((b) => b.asset === asset).reduce((s, b) => s + Number(b.free) + Number(b.locked), 0);
  const earn = flexible.rows.filter((x) => x.asset === asset).reduce((s, x) => s + Number(x.totalAmount), 0);
  if (spot + earn > 0) console.log(`  ${asset.padEnd(6)} spot ${spot} · earn ${earn} · total ${spot + earn}`);
}

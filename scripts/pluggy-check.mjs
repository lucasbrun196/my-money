#!/usr/bin/env node
/**
 * Diagnóstico da Pluggy. Uso: npm run check:pluggy
 *
 * 1. Autentica com PLUGGY_CLIENT_ID/SECRET (.env.local).
 * 2. Lista os Items (conexões) — ou testa os itemIds do .env.local, se a aplicação não puder listar.
 * 3. Para cada item: contas, nº de transações dos últimos 30 dias, faturas e investimentos.
 */
const BASE = process.env.PLUGGY_API_BASE ?? "https://api.pluggy.ai";
const { PLUGGY_CLIENT_ID: clientId, PLUGGY_CLIENT_SECRET: clientSecret } = process.env;

if (!clientId || !clientSecret) {
  console.error("Defina PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET no .env.local");
  process.exit(1);
}

async function call(path, apiKey, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(apiKey ? { "X-API-KEY": apiKey } : {}), ...init.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}: ${body.message ?? JSON.stringify(body)}`);
  return body;
}

const { apiKey } = await call("/auth", null, { method: "POST", body: JSON.stringify({ clientId, clientSecret }) });
console.log("✓ Autenticado na Pluggy\n");

// IDs já configurados no .env.local (ou passados como argumento: npm run check:pluggy -- <itemId>)
const configuredIds = [...process.argv.slice(2), process.env.PLUGGY_SANTANDER_ITEM_ID, process.env.PLUGGY_XP_ITEM_ID].filter(Boolean);

let items = [];
try {
  let next = "/v2/items";
  while (next) {
    const page = await call(next, apiKey);
    items.push(...page.results);
    next = page.next ? `/v2/items${page.next.replace(/^[^?]*/, "")}` : null;
  }
} catch (err) {
  // Aplicações de desenvolvimento normalmente não podem listar items (HTTP 403).
  if (configuredIds.length === 0) {
    console.log("Esta aplicação não pode listar as conexões (" + err.message.split("→ ")[1] + ").");
    console.log("Copie o Item ID no app demo do Dashboard (menu ⋮ → \"Copiar Item ID\"),");
    console.log("cole em PLUGGY_SANTANDER_ITEM_ID no .env.local e rode de novo.");
    process.exit(0);
  }
}
for (const id of configuredIds) {
  if (!items.some((i) => i.id === id)) items.push(await call(`/items/${id}`, apiKey));
}

if (items.length === 0) {
  console.log("Nenhum item encontrado. Conecte o Meu Pluggy pelo app de demonstração do Dashboard (veja docs/02-pluggy.md).");
  process.exit(0);
}

const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

for (const item of items) {
  console.log(`■ ${item.connector?.name ?? "?"}`);
  console.log(`  itemId: ${item.id}`);
  console.log(`  status: ${item.status} · última atualização: ${item.lastUpdatedAt ?? "-"}`);

  const accounts = (await call(`/accounts?itemId=${item.id}`, apiKey)).results;
  for (const a of accounts) {
    const tx = await call(`/v2/transactions?accountId=${a.id}&dateFrom=${since}`, apiKey);
    console.log(`  • ${a.type}/${a.subtype} "${a.marketingName ?? a.name}" — ${tx.results.length}${tx.next ? "+" : ""} transações em 30 dias`);
    if (a.type === "CREDIT") {
      const bills = (await call(`/bills?accountId=${a.id}`, apiKey)).results;
      console.log(`    faturas disponíveis: ${bills.length}`);
      const sample = tx.results.slice(0, 3).map((t) => `${t.type} ${t.amount} "${t.description}"`);
      if (sample.length) console.log(`    amostra (confira o sinal das compras): ${sample.join(" | ")}`);
    }
    if (a.bankData?.reservedBalances?.length) {
      console.log(`    saldos reservados: ${a.bankData.reservedBalances.map((r) => r.name).join(", ")}`);
    }
  }

  const inv = await call(`/investments?itemId=${item.id}`, apiKey).catch(() => ({ results: [] }));
  if (inv.results.length) {
    console.log(`  • ${inv.results.length} investimentos: ${inv.results.map((i) => `${i.name} (${i.type})`).join("; ")}`);
  }
  console.log("");
}

console.log("Copie os itemIds para PLUGGY_SANTANDER_ITEM_ID e PLUGGY_XP_ITEM_ID no .env.local.");

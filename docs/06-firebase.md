# Preparação para o Firebase (futuro)

Hoje o MyMoney **não tem banco de dados**: tudo vem das APIs, com cache. O código já está organizado para plugar o Firestore sem refatorar as telas.

## O que já está pronto

| Peça | Onde | Para quê |
|---|---|---|
| Interface `HistoryRepository` | [src/server/repositories/types.ts](../src/server/repositories/types.ts) | `saveDailySnapshot`, `getSnapshots`, `archiveTransactions`, `getArchivedTransactions` |
| Implementação no-op | [src/server/repositories/history/noop.ts](../src/server/repositories/history/noop.ts) | Hoje não grava nada (`enabled: false`) |
| Fábrica única | [src/server/repositories/index.ts](../src/server/repositories/index.ts) | Só aqui se troca `noop` → `firestore` |
| Ponto de gravação | [src/server/services/overview.ts](../src/server/services/overview.ts) | Já chama `history.saveDailySnapshot(...)` via `after()` (depois da resposta, sem atrasar a página) quando `enabled` for `true` |
| Tipos serializáveis | [src/domain/types.ts](../src/domain/types.ts) | Datas em string ISO e valores numéricos: vão direto para documentos do Firestore |

## Plano de implementação (sem plano Blaze)

**Não use Cloud Functions.** O backend continua nas funções da Vercel, que acessam o Firestore com o **Admin SDK**. O Firestore funciona no plano **Spark (grátis)**: 1 GiB de armazenamento, 50 mil leituras e 20 mil gravações por dia, muito acima do uso de uma pessoa.

1. **Firebase Console** → criar projeto (plano Spark) → **Firestore Database** → modo produção → localização **`southamerica-east1` (São Paulo)**, perto da região `gru1` da Vercel.
2. **Regras do Firestore:** bloqueie todo acesso do cliente (só o servidor acessa):
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} { allow read, write: if false; }
     }
   }
   ```
3. **Conta de serviço:** *Configurações do projeto → Contas de serviço → Gerar nova chave privada* (JSON). Guarde em uma variável de ambiente (nunca no repositório):
   ```env
   FIREBASE_SERVICE_ACCOUNT_BASE64=...   # base64 do JSON
   ```
4. `npm install firebase-admin` e crie `src/server/repositories/history/firestore.ts`:
   ```ts
   import "server-only";
   import { cert, getApps, initializeApp } from "firebase-admin/app";
   import { getFirestore } from "firebase-admin/firestore";
   import type { HistoryRepository } from "../types";

   const app =
     getApps()[0] ??
     initializeApp({
       credential: cert(JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64!, "base64").toString())),
     });
   const db = getFirestore(app);

   export const firestoreHistoryRepository: HistoryRepository = {
     enabled: true,
     async saveDailySnapshot(s) {
       await db.collection("snapshots").doc(s.date).set(s); // 1 doc por dia (idempotente)
     },
     async getSnapshots(from, to) {
       const q = await db.collection("snapshots").where("date", ">=", from).where("date", "<=", to).orderBy("date").get();
       return q.docs.map((d) => d.data() as never);
     },
     async archiveTransactions(txs) {
       const batch = db.batch();
       for (const t of txs) batch.set(db.collection("transactions").doc(t.id), t, { merge: true });
       await batch.commit(); // até 500 por batch
     },
     async getArchivedTransactions(from, to) {
       const q = await db.collection("transactions").where("date", ">=", from).where("date", "<=", to).get();
       return q.docs.map((d) => d.data() as never);
     },
   };
   ```
5. Em `repositories/index.ts`, troque `history: noopHistoryRepository` por `firestoreHistoryRepository`.
6. **Gravação diária automática:** crie um Route Handler `src/app/api/cron/snapshot/route.ts`, protegido por `Authorization: Bearer ${CRON_SECRET}`, que monta o snapshot e arquiva as transações. Agende no `vercel.json`:
   ```json
   { "regions": ["gru1"], "crons": [{ "path": "/api/cron/snapshot", "schedule": "0 9 * * *" }] }
   ```
   No Hobby, cron jobs rodam **no máximo 1x por dia** e com precisão de ±59 min, o que basta para uma foto diária. Libere `/api/cron` no `matcher` do `proxy.ts`, porque a rota se autentica pelo `CRON_SECRET`.
7. **Telas que ficam possíveis:** gráfico de evolução do patrimônio, comparação mês a mês e gastos de anos anteriores. Para isso, o `getBankingView` junta `history.getArchivedTransactions()` com as transações ao vivo, deduplicando por `id`.

## Opcional: login com Firebase Auth

Se quiser trocar a senha única por *login com Google*, o Firebase Auth também é grátis no Spark. A verificação do ID token aconteceria em `src/server/auth/` (mesma interface `requireSession`), e o resto do app não muda.

# Fase 1 — Binance (somente leitura)

## 1. Criar a API Key

1. Entre na Binance pelo navegador: **Perfil → Gerenciamento de API** (*API Management*).
2. **Criar API** → escolha **"Gerada pelo sistema"** (*System generated*, usa HMAC-SHA256) → dê um nome (ex.: `mymoney-leitura`) → confirme com 2FA.
3. Copie a **API Key** e a **Secret Key**. ⚠️ A Secret aparece **uma única vez**.
4. Clique em **Editar restrições** e deixe assim:
   - ✅ **Habilitar leitura** (*Enable Reading*), a única permitida
   - ❌ Spot & Margin Trading, ❌ Saques, ❌ Futuros, ❌ Transferência universal
5. **Restrição de IP:**
   - Funções serverless gratuitas (Vercel, Netlify, Cloudflare) **não têm IP fixo**, então a restrição por IP bloquearia o próprio app. IP fixo na Vercel é recurso pago.
   - Com a key só de leitura, deixar **sem restrição** é aceitável: mesmo vazada, ela **não move dinheiro**. A Binance exige IP restrito para habilitar saque, e aqui o saque fica desligado.
   - Se quiser rodar só localmente, restrinja ao IP da sua casa.
6. Coloque no `.env.local` e na Vercel:
   ```env
   BINANCE_API_KEY=...
   BINANCE_API_SECRET=...
   ```
7. Confira as permissões e os saldos:
   ```bash
   npm run check:binance
   ```
   O script **acusa erro** se trade, saque, futuros ou transferência estiverem habilitados.

## 2. Endpoints

Base `https://api.binance.com`. Código em [src/server/integrations/binance/client.ts](../src/server/integrations/binance/client.ts).

| Endpoint | Assinado? | Uso |
|---|---|---|
| `GET /api/v3/account?omitZeroBalances=true` | sim | Saldos **Spot** (`free + locked`). Ignora `LDBTC`/`LDSOL`, que são a representação do Earn dentro do Spot, para não contar duas vezes. |
| `GET /sapi/v1/simple-earn/flexible/position?size=100` | sim | BTC no **Simple Earn flexível** (`totalAmount`) |
| `GET /sapi/v1/simple-earn/locked/position?size=100` | sim | Earn travado, se houver |
| `GET /api/v3/ticker/price?symbols=["BTCBRL","BTCUSDT","SOLBRL","SOLUSDT","USDTBRL"]` | não | Preços em R$ e US$, e o dólar (USDT/BRL). Se `api.binance.com` falhar, usa `data-api.binance.vision`. |
| `GET /sapi/v1/account/apiRestrictions` | sim | Só no script de diagnóstico |

Todos os ativos com saldo entram automaticamente. Stablecoins (USDT, USDC, FDUSD…) ficam de fora, e você pode ignorar outros em `config/finance.ts → crypto.ignoreAssets` (hoje: BNB). Saldos abaixo de R$ 1 ("poeira") também são ignorados.

| Endpoint (preço médio) | Uso |
|---|---|
| `GET /api/v3/myTrades?symbol=BTCUSDT…` | Trades Spot em pares USDT/USDC/FDUSD/BRL |
| `GET /sapi/v1/fiat/payments?transactionType=0` | Compras com PIX/cartão (janelas de 90 dias) |
| `GET /sapi/v1/convert/tradeFlow` | Binance Convert (janelas de 30 dias) |
| `GET /api/v3/klines?symbol=USDTBRL&interval=1d` | Dólar do dia de cada compra em reais |

## 3. Assinatura HMAC-SHA256

```ts
import { createHmac } from "node:crypto";

const params = new URLSearchParams({
  omitZeroBalances: "true",
  recvWindow: "10000",               // janela de validade (ms, máx. 60000)
  timestamp: String(Date.now()),     // obrigatório
}).toString();

const signature = createHmac("sha256", BINANCE_API_SECRET).update(params).digest("hex");

await fetch(`https://api.binance.com/api/v3/account?${params}&signature=${signature}`, {
  headers: { "X-MBX-APIKEY": BINANCE_API_KEY },
});
```

- O *payload* assinado é a **query string exata** que vai na URL, na mesma ordem.
- Erro `-1021` (timestamp fora da janela): o cliente sincroniza com `/api/v3/time` e repete a chamada.
- A Binance recomenda chaves **Ed25519** como alternativa ainda mais segura. Dá para migrar depois trocando só a função `sign()`.

## 4. Resultado e preço médio

- O preço médio é **calculado pelo seu histórico** dos últimos 2 anos (trades, compras com PIX/cartão e Convert), pelo método do custo médio, em US$. Compras em reais são convertidas pelo dólar daquele dia, com as taxas incluídas, então pode diferir um pouco do número do app da Binance.
- Rendimentos do Earn, depósitos vindos de outra corretora e P2P não têm custo registrado. O card mostra quanto da quantidade tem custo conhecido.
- O histórico é pesado (dezenas de chamadas). Ele fica em cache por 12 h ou até você tocar em ↻.
- Se a API privada falhar, o card mostra o erro. Não há quantidades "de reserva" no código.

## 5. Atenção: bloqueio por região (HTTP 451)

A Binance recusa chamadas de IPs dos EUA. A Vercel roda funções em `iad1` (Washington) **por padrão**. Por isso o [vercel.json](../vercel.json) fixa a região **`gru1` (São Paulo)**. Se mesmo assim aparecer *"HTTP 451"* no card, confira em **Vercel → Settings → Functions → Function Region** se está `gru1`.

> Redes corporativas costumam bloquear sites de cripto. Se `npm run check:binance` falhar com "falha de rede" no trabalho, teste em casa ou no 4G.

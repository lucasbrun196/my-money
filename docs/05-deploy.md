# Rodar localmente e fazer o deploy gratuito

## Local

Requisitos: Node.js 20.9+ (testado no 22) e npm.

```bash
npm install
cp .env.example .env.local
npm run setup:auth          # cole AUTH_SECRET e AUTH_PASSWORD_HASH no .env.local
npm run dev                 # http://localhost:3000
```

- `DEMO_MODE=true` usa dados fictícios. Para dados reais, use `false` e preencha as integrações.
- Teste a conexão com as APIs **antes** de abrir o app:
  ```bash
  npm run check:binance
  npm run check:pluggy
  ```
- Para abrir no celular na mesma rede Wi-Fi, acesse o endereço "Network" que o `npm run dev` mostra (ex.: `http://192.168.0.10:3000`).
- Antes de subir: `npm test && npm run typecheck && npm run lint && npm run build`.

## Por que Vercel

| Opção grátis | Veredito |
|---|---|
| **Vercel Hobby** ✅ | Feita para Next.js 16 (Cache Components, `use cache: remote` → Runtime Cache, streaming). Escolha de região (**gru1**), deploy a cada push, sem cartão. O Hobby é para uso pessoal e não comercial, que é exatamente o caso. |
| Netlify Free | Roda Next via adaptador. Funciona, mas os recursos novos do Next chegam depois e não há o Runtime Cache. |
| Cloudflare Workers/Pages | Free tier generoso, mas o Next roda via OpenNext (mais configuração), não dá para escolher a região, a Binance costuma bloquear IPs de datacenter e o `firebase-admin` (gRPC/Node) não roda bem lá. |
| Firebase Hosting + Cloud Functions | Cloud Functions exige o plano **Blaze** (cartão). Descartado. |
| Render / Railway | Render grátis "dorme" (≈50 s para acordar); Railway é pago. |

**Combina com o Firebase?** Sim. As funções da Vercel são Node.js, então rodam o `firebase-admin` sem problema e acessam o **Firestore no plano Spark (grátis)**. Não é preciso Cloud Functions. Detalhes em [06-firebase.md](06-firebase.md).

## Deploy na Vercel (passo a passo)

1. **GitHub (repositório PRIVADO):**
   ```bash
   git init
   git add .
   git commit -m "MyMoney: primeira versão"
   ```
   Crie um repositório **privado** em github.com/new e faça o push (`git remote add origin ...` + `git push -u origin main`).
   O `.gitignore` já ignora `.env*` (exceto o `.env.example`). Confira com `git status` que o `.env.local` **não** aparece.
2. **Vercel:** acesse **vercel.com** → *Sign up* com o GitHub → plano **Hobby**.
3. **Add New… → Project** → importe o repositório. A Vercel detecta o Next.js; não mude o build.
4. **Environment Variables** (antes do primeiro deploy): copie **todas** as variáveis do seu `.env.local`, uma por uma:
   - `AUTH_SECRET`, `AUTH_PASSWORD_HASH`, `AUTH_SESSION_DAYS`
   - `BINANCE_API_KEY`, `BINANCE_API_SECRET`
   - `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET`, `PLUGGY_SANTANDER_ITEM_ID`, `PLUGGY_XP_ITEM_ID`
   - `BRAPI_TOKEN`
   - `DEMO_MODE=false`
   > Dica: no campo de variáveis dá para colar o conteúdo inteiro do `.env.local` de uma vez.
5. **Deploy.** Ao terminar, você recebe a URL `https://<projeto>.vercel.app`.
6. **Confira a região:** *Project → Settings → Functions → Function Region* deve mostrar **São Paulo (gru1)**. O [vercel.json](../vercel.json) já fixa isso; é importante por causa do bloqueio da Binance a IPs dos EUA.
7. **No celular:** abra a URL → menu do navegador → **"Adicionar à tela inicial"**. O MyMoney abre em tela cheia, como app (o manifest já está configurado).

### Depois do deploy

- Cada `git push` na `main` gera um novo deploy. Branches viram *Preview Deployments*, que já ficam protegidos pela **Vercel Authentication** (padrão do Hobby).
- Mudou uma variável de ambiente? Ela só vale depois de um **Redeploy** (*Deployments → ⋯ → Redeploy*).
- Para trocar a senha, rode `npm run setup:auth`, atualize `AUTH_PASSWORD_HASH` e faça o redeploy. Trocar a `AUTH_SECRET` derruba todas as sessões abertas.
- Os logs ficam em *Project → Logs*. Os erros das APIs aparecem também nos próprios cards.
- Domínio próprio é opcional e grátis no Hobby (*Settings → Domains*), mas você precisa ter o domínio.

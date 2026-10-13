# MyMoney

Painel pessoal de finanças: gastos do Santander, fatura do cartão, salário, investimentos na XP e cripto na Binance. É **mobile-first**, tem tema escuro, custa **zero** e é feito para um único usuário.

| Tela | O que mostra |
|---|---|
| **Início** | Patrimônio total por classe, teto da quinzena (R$ 900) com alerta, saldo, salário, fatura, metas e gastos fixos |
| **Gastos** | Filtro por dia, semana, mês e ano; conta e/ou cartão; só gastos variáveis; categorias com gráfico |
| **Cartão** | Fatura aberta, previsão de fechamento, meta da anuidade (R$ 2.000), limite, próximas faturas, parcelamentos |
| **Investir** | Open Finance (XP/Santander): valor atual, preço médio, resultado em R$ e %, peso de cada ativo |
| **Cripto** | Todos os ativos da Binance (Spot + Earn): quantidade, valor em R$ e US$, preço médio calculado pelo histórico |

## Stack (e por quê)

| Camada | Escolha | Motivo |
|---|---|---|
| Framework | **Next.js 16** (App Router, React 19, TypeScript) | Front e back no mesmo projeto. Os *secrets* ficam só no servidor (Server Components e Server Actions). O streaming com `<Suspense>` dá carregamento progressivo com skeletons. O cache por função (`"use cache: remote"`) evita chamadas repetidas às APIs. |
| Hospedagem | **Vercel Hobby** (grátis, sem cartão) | Suporte nativo ao Next 16, funções serverless na região **gru1 (São Paulo)**, variáveis de ambiente, cache remoto e deploy a cada `git push`. |
| Estilo | **Tailwind CSS 4** | Tokens de tema escuro em CSS, sem runtime e com bundle pequeno. |
| Gráficos | **Recharts 3** | Gráficos declarativos em React, com animação e tooltip. A paleta foi validada para daltonismo. |
| Auth | Senha única (hash **scrypt**) + cookie JWT (**jose**) | Um único usuário, sem banco de dados e sem serviço externo. |
| Testes | **Vitest** | Testa a lógica de negócio (quinzena, fatura, parcelas). |

**Por que não NestJS ou Flutter?** O NestJS precisaria de um servidor sempre ligado: no plano grátis do Render ele dorme e leva cerca de 50 s para acordar, e no Fly/Railway é pago. Seriam dois deploys para manter. O Flutter Web carrega um bundle pesado (CanvasKit), que abre devagar no navegador do celular, e mesmo assim precisaria de um backend para guardar os secrets. Para quem já sabe TypeScript, o Next resolve as duas coisas em um projeto só. A organização em `domain/`, `repositories/` e `services/` lembra a do NestJS.

## Começando (5 minutos, modo demo)

```bash
npm install
cp .env.example .env.local      # depois edite (veja abaixo)
npm run setup:auth              # gera AUTH_SECRET e AUTH_PASSWORD_HASH -> cole no .env.local
npm run dev                     # http://localhost:3000
```

Com `DEMO_MODE=true` no `.env.local`, o app usa dados fictícios e não chama nenhuma API. Serve para ver a interface antes de configurar as integrações.

## Integrações (em fases)

1. **Fase 1 — Binance:** [docs/03-binance.md](docs/03-binance.md) (API Key somente leitura, assinatura HMAC-SHA256)
2. **Fase 2 — Santander via Pluggy:** [docs/02-pluggy.md](docs/02-pluggy.md) (Meu Pluggy + Dashboard → `clientId`, `clientSecret`, `itemId`)
3. **Fase 3 — XP:** [docs/04-xp.md](docs/04-xp.md) (posições pelo Open Finance + cotação da brapi para as ações)
4. **Fase 4 — Painel com metas e alertas:** já incluído.

**Nada de dado financeiro fica no código.** Saldo, salário (pagador e dias), gastos fixos, ciclo do cartão, posições e preço médio vêm das APIs ou são deduzidos das transações. Em [src/config/finance.ts](src/config/finance.ts) ficam só as **preferências** que nenhuma API conhece: o teto da quinzena (R$ 900), as metas, a meta da anuidade (R$ 2.000) e os ativos de cripto a ignorar.

Cada integração funciona sozinha. Se uma não estiver configurada ou falhar, o card mostra o motivo e o resto do painel continua funcionando.

Mais documentação:
- Arquitetura, cache e segurança: [docs/01-arquitetura.md](docs/01-arquitetura.md)
- Deploy gratuito: [docs/05-deploy.md](docs/05-deploy.md)
- Preparação para o Firebase: [docs/06-firebase.md](docs/06-firebase.md)

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e execução de produção |
| `npm test` | Testes da lógica de negócio (Vitest) |
| `npm run typecheck` / `npm run lint` | TypeScript / ESLint |
| `npm run setup:auth` | Gera a senha (hash) e o secret do login |
| `npm run check:pluggy` | Lista os seus *Items* da Pluggy (copie os `itemId`) e testa contas, transações, faturas e investimentos |
| `npm run check:binance` | Confere se a API Key é **somente leitura** e mostra os saldos de BTC e SOL |

## Estrutura de pastas

```
my-money/
├── docs/                         # passo a passo das integrações, deploy e Firebase
├── scripts/                      # setup-auth, pluggy-check, binance-check
├── src/
│   ├── app/                      # rotas (Next App Router)
│   │   ├── (app)/                # área logada: layout com navegação
│   │   │   ├── page.tsx          # Início (visão geral)
│   │   │   ├── gastos/  cartao/  investimentos/  cripto/
│   │   │   └── actions.ts        # Server Actions: atualizar dados, sair
│   │   ├── login/                # tela de login + action com rate limit
│   │   ├── layout.tsx  globals.css  manifest.ts  robots.ts  icon.svg
│   ├── proxy.ts                  # bloqueia tudo sem sessão (antigo middleware)
│   ├── config/finance.ts         # só preferências: teto, metas, meta da anuidade, cripto a ignorar
│   ├── domain/                   # lógica pura e testável (sem I/O)
│   │   ├── salary.ts  spending.ts  credit-card.ts  portfolio.ts  goals.ts ...
│   │   └── domain.test.ts
│   ├── server/                   # só roda no servidor ("server-only")
│   │   ├── env.ts  http.ts  cache-tags.ts
│   │   ├── auth/                 # senha scrypt, JWT, verificação de sessão (DAL)
│   │   ├── integrations/         # clientes HTTP: binance/, pluggy/, quotes.ts (brapi + BCB)
│   │   ├── repositories/         # contratos + implementações live / demo / history (Firebase futuro)
│   │   └── services/             # compõem repositórios + domínio para as telas
│   ├── components/               # ui/, charts/, nav/, features/<tela>/
│   └── lib/                      # formatação pt-BR, datas (fuso de SP), cores
├── .env.example                  # todas as variáveis, comentadas
├── next.config.ts                # perfis de cache + cabeçalhos de segurança
└── vercel.json                   # região gru1 (São Paulo)
```

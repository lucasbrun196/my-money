# CLAUDE.md — MyMoney

Guia de contexto para agentes de IA (e humanos) que trabalham neste repositório. Leia também o [AGENTS.md](AGENTS.md): o Next.js aqui é a **versão 16**, com APIs diferentes das que você pode conhecer. Antes de usar uma API do Next, consulte `node_modules/next/dist/docs/`.

## 1. O que é o projeto

**MyMoney** é um painel **pessoal** de finanças, para **um único usuário**, com **custo zero**:

- **Santander** (conta corrente + cartão de crédito) e **XP** (investimentos) via **Open Finance**, pela **Pluggy** (Meu Pluggy, gratuito para uso pessoal).
- **Binance** (cripto), com API Key **somente leitura**.
- Indicadores de mercado: ações da B3, Ibovespa, Selic, CDI, IPCA, câmbio.

O app é **mobile-first** (usado no navegador do celular), em **tema escuro**, com UI e textos em **português do Brasil** e valores em **R$ 1.234,56**.

### Princípio central: nada de dado financeiro fixo no código
O dono do projeto pediu explicitamente: **tudo deve vir das APIs ou ser deduzido dos dados delas**. Nunca escreva no código:
- saldos, posições, quantidades, preços médios;
- nome do empregador, valores ou dias de salário;
- lista de gastos fixos, dia de fechamento ou vencimento do cartão;
- **nomes de pessoas ou empresas** (o repositório é **público**).

O que **pode** ficar no código são as **preferências** do usuário, que nenhuma API conhece. Elas ficam só em [src/config/finance.ts](src/config/finance.ts): meta de gasto para isenção da anuidade e ativos de cripto a ignorar. O dono pediu **nenhum alvo fixo** para reservas (o painel lista o que vem do banco) e **removeu o teto da quinzena**: não recrie sem pedido.

Testes e modo demo usam **dados inventados e genéricos** ("Empresa Exemplo", "Fulana de Tal", tickers fictícios como `ABCD3`). Nunca copie dados reais do usuário para fixtures.

## 2. Stack

| Camada | Escolha |
|---|---|
| Framework | **Next.js 16.4** (App Router, React 19.3, TypeScript strict), com `cacheComponents: true` e `partialPrefetching: true` |
| Estilo | **Tailwind CSS 4** (tokens em `@theme` no [globals.css](src/app/globals.css)) |
| Gráficos | **Recharts 3** (não use `<Cell>`, que está obsoleto: passe `fill` em cada item dos dados) |
| Ícones | `lucide-react` |
| Auth | Senha única (hash **scrypt**) + cookie com **JWT HS256** (`jose`) |
| Testes | **Vitest** (lógica de domínio) |
| Hospedagem | **Vercel Hobby**, região **`gru1`** (São Paulo), fixada em [vercel.json](vercel.json) |
| Persistência | **Nenhuma por enquanto** (Firebase planejado; ver §9) |

## 3. Comandos

```bash
npm run dev            # servidor local (http://localhost:3000)
npm run build          # build de produção
npm test               # Vitest (src/**/*.test.ts)
npm run typecheck      # tsc --noEmit
npm run lint           # ESLint (inclui regras do React Compiler)
npm run setup:auth     # gera AUTH_SECRET e AUTH_PASSWORD_HASH
npm run check:pluggy   # diagnóstico da Pluggy (usa .env.local)
npm run check:binance  # confere se a key da Binance é só leitura + saldos
```

**Antes de entregar qualquer mudança:** `npm run typecheck && npm run lint && npm test && npm run build`. Se mudar perfis em `cacheLife`, rode `npx next typegen` para atualizar os tipos.

## 4. Variáveis de ambiente

Ficam em `.env.local` (ignorado pelo git) e na Vercel. O modelo está em [.env.example](.env.example). A leitura é centralizada em [src/server/env.ts](src/server/env.ts).

| Variável | Uso |
|---|---|
| `DEMO_MODE` | `true` = dados fictícios, sem chamar nenhuma API |
| `AUTH_SECRET`, `AUTH_PASSWORD_HASH`, `AUTH_SESSION_DAYS` | Login |
| `BINANCE_API_KEY`, `BINANCE_API_SECRET` | Binance (somente leitura) |
| `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET` | Aplicação no Dashboard da Pluggy |
| `PLUGGY_SANTANDER_ITEM_ID`, `PLUGGY_XP_ITEM_ID` | Itens (conexões) do Meu Pluggy |
| `BRAPI_TOKEN` | Cotações da B3 (plano grátis) |

**Nunca** leia, imprima ou copie valores do `.env.local` em respostas, logs, commits ou arquivos. Para diagnosticar, mostre só se a variável está preenchida.

## 5. Arquitetura

```
src/
├── app/                      rotas (App Router)
│   ├── (app)/                área logada: layout com nav (inferior no celular, lateral no desktop)
│   │   ├── page.tsx          Início (patrimônio, saldo, salário, fatura, reservas)
│   │   ├── gastos/           explorador de gastos (dia/semana/mês/ano, filtros, categorias)
│   │   ├── cartao/           fatura aberta, parcelamentos, comparar faturas, evolução (linha), lançamentos
│   │   ├── investimentos/    painel de indicadores + carteira
│   │   ├── cripto/           Binance
│   │   └── actions.ts        Server Actions: refreshData (updateTag + refresh), logout
│   ├── login/                tela + action com limite de tentativas
│   └── layout.tsx            raiz (script de privacidade antes da pintura, suppressHydrationWarning)
├── proxy.ts                  "middleware" do Next 16: exige sessão em tudo, exceto /login e estáticos
├── config/finance.ts         SÓ preferências do usuário
├── domain/                   lógica PURA, sem I/O, testável (roda no servidor e no cliente)
├── lib/                      formatação pt-BR, datas (fuso de SP), cores, privacidade
├── components/               ui/, charts/, nav/, features/<tela>/
└── server/                   só servidor (import "server-only")
    ├── env.ts, http.ts       env centralizado; fetchJson com timeout e mensagens de erro claras
    ├── auth/                 password (scrypt), token (JWT), dal (requireSession)
    ├── integrations/         clientes HTTP: pluggy/, binance/, quotes.ts (brapi), market.ts
    ├── repositories/         contratos + implementações live / demo / history (no-op)
    └── services/             compõem repositórios + domínio para as telas (React.cache por requisição)
```

### Fluxo de dados
`page (RSC) → <Suspense> → seção async → services (requireSession + React.cache) → repositories (getRepositories()) → integrations (fetch) → domain (cálculos)`

- **[src/server/repositories/index.ts](src/server/repositories/index.ts)** é o **único** lugar que decide a fonte (demo × live × futuro Firestore).
- Toda resposta de repositório vem no envelope **`Sourced<T>`** (`live | demo | fallback | unconfigured | error`, mais `notes`). A UI mostra um selo de origem (`SourceBadge`) e os avisos.
- **Falhas não derrubam a página:** cada integração devolve um estado de erro/não configurado, e cada card mostra o motivo.
- Valores monetários exibidos usam `<Money>` ou a classe CSS `money`, que é borrada no **modo privacidade** (botão do olho).

### Camadas: regras
- `domain/` **não importa** nada de `server/`, `next/*` nem faz fetch. Datas são strings `YYYY-MM-DD` no fuso **America/Sao_Paulo** ([src/lib/dates.ts](src/lib/dates.ts)); não use `Date` na lógica de negócio.
- `server/**` sempre começa com `import "server-only"`. Client Components nunca importam de `server/`.
- Constantes compartilhadas entre servidor e cliente ficam em `lib/` (não exporte constantes de arquivos `"use client"`: viram referência de cliente).

## 6. Next.js 16: armadilhas deste projeto

- **Cache Components ligado.** Ler `cookies()` ou chamar `new Date()` antes de dados dinâmicos fora de `<Suspense>` quebra o build/prerender. Por isso os serviços chamam `getToday()`, que lê a sessão antes de calcular "hoje".
- **Cache das APIs:** funções com `"use cache: remote"` + `cacheTag(...)` + `cacheLife("<perfil>")`. Os perfis ficam em [next.config.ts](next.config.ts): `prices`, `balances`, `bank`, `quotes`, `market`, `reference`. As tags ficam em [src/server/cache-tags.ts](src/server/cache-tags.ts).
  - Uma função cacheada **lança** erro em caso de falha (assim o erro não fica em cache), e o repositório converte em `Sourced` de erro.
  - Argumentos e tags viram chave de cache em **texto puro**: nunca passe segredos como argumento.
  - Retornos precisam ser serializáveis e pequenos (limite de 2 MB por item no Runtime Cache da Vercel). Mapeie para os tipos de domínio antes de retornar.
- **Invalidação:** `updateTag` só funciona em Server Action. O botão ↻ chama `refreshData()`, que expira todas as tags e chama `refresh()`. Em Route Handlers, use `revalidateTag(tag, "max")` (a forma com 1 argumento está obsoleta).
- **`middleware.ts` foi renomeado para `proxy.ts`** (roda em Node). A verificação do JWT fica em [src/server/auth/token.ts](src/server/auth/token.ts), sem dependências do Next.
- **Defesa em profundidade:** além do proxy, toda leitura de dados passa por `requireSession()` ([src/server/auth/dal.ts](src/server/auth/dal.ts)).
- **Revelação dos `<Suspense>` usa requestAnimationFrame:** num navegador com a aba oculta, os skeletons não são substituídos. Isso não é bug do app.
- React Compiler/ESLint reclama de `useMemo` com dependências instáveis e de `setState` dentro de `useEffect`. Prefira cálculo direto ou `useSyncExternalStore`.

## 7. Integrações (detalhes que já custaram tempo)

### Pluggy (Santander e XP via Meu Pluggy)
- Auth: `POST /auth` devolve uma `apiKey` válida por 2 h, guardada em memória e renovada com folga, e enviada no header `X-API-KEY`.
- **Transações: use `GET /v2/transactions`** (paginação por cursor, `next` → `after`). O `/transactions` antigo foi descontinuado.
- **Sinal das transações:** a Pluggy normaliza o `type` (no cartão, compra = `DEBIT` e pagamento = `CREDIT`). O mapper converte tudo para "negativo = saída".
- **`billForecastDate` (AAAA-MM) não é o mês do vencimento** no Santander: vem um mês antes. O deslocamento é **aprendido** comparando com `billId` → `/bills` (`inferForecastOffset`). A ordem de prioridade é `billId`, depois a previsão corrigida, depois a data e o ciclo.
- **Parcelas:** `creditCardMetadata.installmentNumber/totalInstallments`. Compras parceladas iguais em anos diferentes são separadas pela fatura da parcela 1.
- **Ciclo do cartão:** mediana dos dias de fechamento e vencimento das últimas faturas (`inferCardCycle`). O banco varia o fechamento em alguns dias.
- **Aplicações de desenvolvimento não podem listar itens** (`/v2/items` → 403). O `itemId` vem do app demo do Dashboard (menu ⋮ → "Copiar Item ID").
- **Investimentos da XP:** ações e fundos vêm **sem `amountOriginal`**. O preço médio é calculado por `/investments/{id}/transactions` (custo médio) e só aparece com **≥ 95% de cobertura** da quantidade; abaixo disso, a UI mostra "histórico incompleto (X%)". O Tesouro vem como `LFT` e é renomeado para "Tesouro Selic AAAA" pelo vencimento.
- A instituição de cada investimento vem de `investment.institution`, com o rótulo do item como reserva.
- O Open Finance pode atrasar até **24 h**, e o Meu Pluggy sincroniza ~1x por dia.

### Binance
- Assinatura **HMAC-SHA256** da query string; header `X-MBX-APIKEY`; tratamento do erro `-1021` (sincroniza o relógio).
- O Spot lista o Earn flexível como `LD<ASSET>`: ignore para não contar em dobro.
- Os ativos vêm dos saldos (sem lista fixa). Stablecoins são ignoradas, e os ativos listados em `crypto.ignoreAssets` também. Poeira abaixo de R$ 1 é descartada.
- **Preço médio** = custo médio pelo histórico de 2 anos: `myTrades` (USDT/FDUSD/USDC/BRL), `fiat/payments` (compras com PIX/cartão) e `convert/tradeFlow`. Compras em BRL são convertidas pelo USDT/BRL diário (klines). O app mostra a **cobertura** (rendimentos do Earn não têm custo).
- **HTTP 451** = IP dos EUA bloqueado. Por isso a função roda em `gru1`.
- **O notebook de desenvolvimento é corporativo:** um firewall com inspeção HTTPS causa `UNABLE_TO_VERIFY_LEAF_SIGNATURE` na Binance (e às vezes na Pluggy). **Não contorne** (nada de `NODE_TLS_REJECT_UNAUTHORIZED=0`). Na Vercel funciona normalmente.

### Dados de mercado ([src/server/integrations/market.ts](src/server/integrations/market.ts))
| Fonte | Uso | Limites |
|---|---|---|
| **brapi.dev** (token) | Cotação, histórico, 52 semanas, P/L, LPA | Plano grátis: histórico de no máximo **3 meses**, **1 ativo por requisição** e **1 requisição simultânea** (chame em sequência). Dividendos, câmbio e módulos fundamentalistas são **pagos** |
| **Yahoo Finance** (`/v8/finance/chart/<TICKER>.SA?events=div`) | Proventos → dividend yield 12m | **Não oficial**, pode mudar sem aviso. Usar só para proventos |
| **AwesomeAPI** (sem chave) | Câmbio (USD, EUR, ARS, GBP) e histórico de até 360 dias | Grátis; requisições sem chave ficam em cache de 1 min no lado deles |
| **Banco Central SGS** | Selic meta (432), CDI anual (4389), IPCA 12m (13522), IPCA mensal (433) | Grátis; às vezes devolve 502 em HTML (já tratado em `fetchJson`) |
| **Binance (público)** | Candles diários de cripto | Use `data-api.binance.vision` como alternativa |

O usuário pediu: **ao adicionar uma API nova, avise e explique** (custo, chave, limites).

## 8. Regras de negócio (resumo)

- **Salário** ([src/domain/salary.ts](src/domain/salary.ts)): o empregador é o pagador com a **maior renda recorrente mensal** (agrupado pelo nome, sem números, porque o CNPJ varia no texto). As partes são o agrupamento dos dias de pagamento (maior "buraco"; dois centros ≥ 8 dias de distância e cada parte com ≥ 25% dos pagamentos). A parte maior é o "Saldo" e a menor o "Adiantamento". O próximo valor é o último da mesma parte.
- **Nome da fatura** ([src/domain/credit-card.ts](src/domain/credit-card.ts), `billReferenceMonth`): como o banco chama, pelo mês da maior parte do ciclo (~15 dias antes do fechamento). Fechamento em 02/09 → "agosto". Internamente a fatura continua identificada pelo **mês do vencimento** (`currentMonth`, `resolveBillMonth`); só os rótulos usam a referência.
- **Comparar faturas** ([src/domain/compare.ts](src/domain/compare.ts)), na tela Cartão: fatura com fatura, pelo **total cobrado pelo banco** (a aberta, parcial). O gráfico é o acumulado por dia do ciclo; com a fatura aberta, compara até o mesmo dia do ciclo. O Open Finance só entrega ~12 meses, então as faturas mais antigas podem ter lançamentos somando menos que o total (o painel avisa).
- **Gastos** ([src/domain/spending.ts](src/domain/spending.ts)): saídas reais de dinheiro (débito, PIX e cartão). Ficam de fora o pagamento de fatura, as transferências próprias e as aplicações.
- **Gastos fixos** ([src/domain/recurring.ts](src/domain/recurring.ts)), sem card próprio (o dono pediu para tirar do Início), mas usados no filtro "Só variáveis" e na previsão da fatura: mesma origem + valor parecido (±12%) + perto do mesmo dia (±5) + ~1 por mês + ≥ 3 meses (ou 2 meses seguidos com valor quase idêntico = "recente") + ativo nos últimos 45 dias.
- **Fatura** ([src/domain/credit-card.ts](src/domain/credit-card.ts)): parcial da fatura aberta, previsão de fechamento (inclui assinaturas detectadas e parcelas ainda não lançadas) e próximas faturas projetadas.
- **Minhas reservas** ([src/domain/reserves.ts](src/domain/reserves.ts)): as reservas do app Santander chegam pelo Open Finance como **CDBs da conexão Santander** (sem o nome dado no app; `reservedBalances` da conta vem nulo). Cada aplicação ativa de renda fixa dessa conexão vira "Reserva N", numerada pela data de aplicação, com taxa, vencimento e carência. Saldos reservados da conta, se vierem, entram com o nome do banco. A posição guarda a conexão de origem em `connection`.

## 9. Persistência futura (Firebase)

- **Não** configure banco de dados sem pedido explícito.
- O ponto de troca já existe: a interface `HistoryRepository` ([src/server/repositories/types.ts](src/server/repositories/types.ts)), hoje com uma implementação no-op. O plano completo está em [docs/06-firebase.md](docs/06-firebase.md): Firestore no plano **Spark** via `firebase-admin` nas funções da Vercel. **Não** use Cloud Functions, que exigem o plano Blaze.
- Itens que dependem do Firebase: histórico de patrimônio, importação do extrato da XP (preço médio exato), uma tela de configurações para editar as preferências e apelidos para as reservas (o Open Finance não envia o nome).

## 10. Convenções de código

- Comentários e textos de UI em **pt-BR**; nomes de código (variáveis, funções) em inglês.
- Formatação sempre por [src/lib/format.ts](src/lib/format.ts) (`brl`, `usd`, `pct`, `signedBrl`, `dateBR`, `monthLabel`...) e, no painel de indicadores, por `formatIndicator`.
- Cores de gráfico: paleta categórica fixa em [src/lib/colors.ts](src/lib/colors.ts) (validada para daltonismo no fundo escuro). A cor acompanha a entidade, nunca a posição no ranking. As cores de status são reservadas.
- Resultado (lucro/prejuízo) aparece com cor **e** ícone **e** sinal (`<Delta>`), nunca só a cor.
- Gráficos clicáveis abrem um `<Sheet>` com `<PeriodSummary>`. Para toque no celular, calcule o ponto pela posição X (o hover do Recharts atualiza só no frame seguinte).
- Sempre que der, mostre **por que** um dado está ausente ("histórico incompleto", "custo não informado", "não configurado"), em vez de inventar números.

## 11. Testes

- Os testes de domínio ficam em [src/domain/domain.test.ts](src/domain/domain.test.ts), com dados **fictícios**.
- Para validar com **dados reais**, crie um teste **temporário** em `src/zz-*.test.ts`, mockando `server-only` e `next/cache`, e rode com `node --env-file=.env.local node_modules/vitest/vitest.mjs run <arquivo>`. **Apague o arquivo em seguida** e nunca o commite. Não imprima valores do `.env.local`.

## 12. Git e PRs

- Repositório: `lucasbrun196/my-money` (**público**). A branch principal é `main`; as mudanças vão por branch de feature + PR.
- **Antes de cada commit**, confira que o `.env.local` não está no índice e que nenhum valor dele aparece nos arquivos.
- Mensagens de commit no formato `tipo(escopo): descrição`, em pt-BR.
- O `gh` pode não estar instalado nesta máquina. Nesse caso, envie a branch e passe ao usuário o link de comparação do GitHub (`/compare/main...<branch>?expand=1`) com título e descrição prontos.

## 13. Ambiente de desenvolvimento

- Windows 11, com PowerShell e Git Bash disponíveis.
- **Cuidado com escapes de shell:** scripts Node inline com regex ou template strings costumam corromper `\b`, `\s` e crases. Para edições complexas, escreva o script num arquivo (ferramenta de escrita) e rode com `node arquivo.cjs`.
- O `.claude/launch.json` define o servidor de preview `npm run dev` na porta 3000.

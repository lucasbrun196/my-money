# Fase 2 — Santander via Open Finance (Meu Pluggy)

O **Meu Pluggy** (meu.pluggy.ai) é o app gratuito da Pluggy para pessoa física: você conecta seus bancos pelo Open Finance oficial. O **Dashboard Pluggy** (dashboard.pluggy.ai) é o portal de desenvolvedor, onde ficam o `clientId` e o `clientSecret`. A ponte entre os dois é o conector **MeuPluggy**: ele funciona como um *proxy* da sua conexão pessoal e entrega os dados para a sua aplicação.

> ⚠️ **Faça tudo dentro do trial de 15 dias do Dashboard.** Segundo o repositório oficial [pluggyai/meu-pluggy](https://github.com/pluggyai/meu-pluggy) e o guia do Actual Budget, a conexão continua funcionando depois do trial, mas a lista de conectores deixa de ser editável. Por isso, conecte **Santander e XP** enquanto o trial estiver ativo.

## 1. Criar a conta no Meu Pluggy e conectar o Santander

1. Acesse **https://meu.pluggy.ai** e crie a conta (e-mail + senha).
2. Toque no botão principal de **conectar conta** e busque **Santander**.
3. Escolha a opção **Open Finance**. Você será levado ao app/site do Santander para autorizar o compartilhamento (contas, cartão de crédito, transações). Autorize pelo **maior prazo** possível (até 12 meses).
4. De volta ao Meu Pluggy, confira se aparecem a **conta corrente** e o **cartão de crédito**.
5. (Fase 3) Repita para a **XP Investimentos**, também via Open Finance, e autorize **investimentos**.

## 2. Criar a aplicação no Dashboard Pluggy

1. Acesse **https://dashboard.pluggy.ai** e crie a conta de desenvolvedor (o trial de 15 dias começa aqui).
2. Crie um **time** (team), se ele pedir.
3. No menu **Applications**, crie uma aplicação (ex.: `mymoney`).
   - Se houver a opção de ambiente, use a **aplicação de desenvolvimento** (*Development*). É ela que dá acesso gratuito aos seus próprios dados.
4. Abra a aplicação e copie:
   - **Client ID** → `PLUGGY_CLIENT_ID`
   - **Client Secret** → `PLUGGY_CLIENT_SECRET` (trate como senha; nunca commite)
5. Nas configurações de **conectores** da aplicação, garanta que o conector **MeuPluggy** esteja habilitado.

## 3. Vincular o Meu Pluggy à aplicação e obter o `itemId`

1. Na página da aplicação, clique em **"Ir para Demo"** (em inglês, *Preview in Demo*). Abre o app de demonstração da Pluggy, já ligado à **sua** aplicação.
2. No widget, escolha o conector **MeuPluggy** e faça a **autorização OAuth** com a sua conta do Meu Pluggy.
3. Selecione o banco (Santander). **Repita o processo para cada banco/corretora** (uma vez para o Santander e outra para a XP; não é por conta).
4. Cada vínculo cria um **Item** com um `itemId`. Para obter o id:
   - no app demo, abra o menu **⋮** (canto superior direito) → **"Copiar Item ID"**.
   - Aplicações de desenvolvimento costumam **não** ter permissão para listar items (HTTP 403), então o Item ID precisa vir do app demo.
   - Depois de colar o id no `.env.local`, valide com o diagnóstico, que mostra contas, transações, faturas e investimentos do item:
     ```bash
     npm run check:pluggy
     ```
5. Preencha no `.env.local` (e depois na Vercel):
   ```env
   PLUGGY_CLIENT_ID=...
   PLUGGY_CLIENT_SECRET=...
   PLUGGY_SANTANDER_ITEM_ID=...
   PLUGGY_XP_ITEM_ID=...        # opcional, fase 3
   DEMO_MODE=false
   ```

## 4. Endpoints usados

Base: `https://api.pluggy.ai`. Código em [src/server/integrations/pluggy/client.ts](../src/server/integrations/pluggy/client.ts).

| Endpoint | Uso no MyMoney |
|---|---|
| `POST /auth` `{ clientId, clientSecret }` | Devolve `apiKey`, válida por **2 h**, enviada no header **`X-API-KEY`**. Fica em memória e é renovada com folga. |
| `GET /items/{itemId}` | Status da conexão (`UPDATED`, `OUTDATED`, `LOGIN_ERROR`...) e `lastUpdatedAt`. |
| `GET /accounts?itemId=` | Conta corrente (`BANK`/`CHECKING_ACCOUNT`) com saldo e "caixinhas" (`bankData.reservedBalances`), e cartão (`CREDIT`) com limite e datas. |
| `GET /v2/transactions?accountId=&dateFrom=` | Transações com **paginação por cursor** (`next` → `after`). O `/transactions` antigo foi descontinuado e só vale **até 31/12/2026**. Por isso o projeto já usa o v2. |
| `GET /bills?accountId=` | Faturas fechadas do cartão (vencimento, total, mínimo). |
| `GET /categories` | Nomes das categorias em português (`descriptionTranslated`). |
| `GET /investments?itemId=` | Posições da XP (fase 3). |

**Convenções que o código já trata:**
- No cartão, a Pluggy normaliza o `type`: **compra = `DEBIT`**, **pagamento da fatura = `CREDIT`**. O MyMoney converte tudo para "negativo = saída".
- Parcelas: `creditCardMetadata.installmentNumber`/`totalInstallments`. `billForecastDate` (AAAA-MM) diz em qual fatura cada lançamento cai, e `billId` liga ao `/bills`. Sem esses campos, o app deduz pela data e pelo fechamento (dia 3).
- **Salário:** detectado sozinho. O empregador é o pagador com a maior renda mensal recorrente, identificado pelo nome (o CNPJ às vezes varia no texto). Os dias de pagamento são aprendidos pelo histórico (ex.: ~6 e ~19), e a parte maior é chamada de "Saldo" e a menor de "Adiantamento".
- **Gastos fixos:** detectados sozinhos. São cobranças da mesma origem, com valor parecido (±12%), perto do mesmo dia do mês, no máximo ~1 por mês, em 3 ou mais meses (ou 2 meses seguidos com valor quase idêntico, marcado como "recente") e ainda ativas (última cobrança há até 45 dias).
- **Ciclo do cartão:** dia de fechamento e de vencimento aprendidos pela mediana das últimas faturas, porque o Santander varia o fechamento entre os dias 2 e 5.

## 5. Limitações conhecidas

- **Atraso de até 24 h:** transações via Open Finance podem levar um dia para aparecer. O Meu Pluggy sincroniza **1x por dia**. O botão ↻ do app busca o que já está na Pluggy, mas não força o banco a atualizar.
- Quando o salário previsto não aparece no dia, o card do teto mostra *"ainda não apareceu — o Open Finance pode levar até 24h"* e mantém a quinzena anterior aberta.
- O consentimento do Open Finance **expira** (no máximo 12 meses). Quando o status do item sair de `UPDATED`, o app mostra o aviso e você renova no meu.pluggy.ai.
- O histórico disponível é de cerca de 12 meses. Para guardar mais tempo, veja [06-firebase.md](06-firebase.md).

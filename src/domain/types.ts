/**
 * Tipos de domínio do MyMoney.
 *
 * Tudo aqui é independente de fonte de dados: as integrações (Pluggy, Binance,
 * brapi...) convertem as respostas para estes formatos, e o futuro
 * repositório do Firebase vai salvar/ler exatamente estes mesmos objetos.
 * Datas são strings ISO "YYYY-MM-DD" (fuso de São Paulo) para serem
 * serializáveis entre servidor, cache e cliente.
 */

export type ISODate = string; // "2026-10-13"
export type YearMonth = string; // "2026-10"

export type DataSourceStatus = "live" | "demo" | "fallback" | "unconfigured" | "error";

/** Envelope usado por toda a camada de serviço: o dado + de onde ele veio. */
export type Sourced<T> = {
  data: T;
  source: DataSourceStatus;
  /** Quando o dado foi obtido na origem (ISO datetime). */
  fetchedAt: string;
  /** Mensagens para o usuário (ex.: "usando quantidades do arquivo de config"). */
  notes?: string[];
};

// ---------------------------------------------------------------------------
// Banco (Santander via Pluggy)
// ---------------------------------------------------------------------------

export type TransactionSource = "conta" | "cartao";

/**
 * Natureza técnica da transação, decidida pelo adaptador da fonte de dados:
 * - regular: compra, PIX para terceiros, tarifa, salário...
 * - internal: transferência entre contas do próprio titular
 * - investment: aplicação/resgate de investimento
 * - card-payment: pagamento de fatura (na conta) ou crédito do pagamento (no cartão)
 */
export type TransactionKind = "regular" | "internal" | "investment" | "card-payment";

export type Transaction = {
  id: string;
  date: ISODate;
  description: string;
  /** Valor com sinal: negativo = saída de dinheiro, positivo = entrada. */
  amount: number;
  source: TransactionSource;
  kind: TransactionKind;
  /** Categoria já traduzida (pt-BR), no nível "pai" (ex.: "Alimentação"). */
  category: string;
  /** Categoria original da Pluggy em inglês (ex.: "Food and drinks"). */
  categoryRaw: string | null;
  categoryId: string | null;
  status: "posted" | "pending";
  /** Nome do pagador/recebedor (PIX/TED), quando disponível. */
  counterpart?: string;
  paymentMethod?: string;
  installment?: {
    number: number;
    total: number;
    purchaseDate?: ISODate;
  };
  /** Mês (YYYY-MM) da fatura em que a transação do cartão cai. */
  billMonth?: YearMonth;
};

export type BankAccount = {
  id: string;
  name: string;
  balance: number;
  /** "Caixinhas"/saldos reservados, quando o banco expõe via Open Finance. */
  reserved: { name: string; amount: number }[];
};

export type CreditCard = {
  id: string;
  name: string;
  brand: string | null;
  level: string | null;
  creditLimit: number | null;
  availableLimit: number | null;
  /** Datas da fatura atual informadas pelo banco (quando existirem). */
  closeDate: ISODate | null;
  dueDate: ISODate | null;
};

export type CardBill = {
  id: string;
  dueDate: ISODate;
  closeDate: ISODate | null;
  total: number;
  minimumPayment: number | null;
};

export type ConnectionInfo = {
  institution: string;
  status: string;
  lastSyncAt: string | null;
};

export type BankSnapshot = {
  connection: ConnectionInfo | null;
  checking: BankAccount | null;
  card: CreditCard | null;
  bills: CardBill[];
  /** Transações dos últimos ~12 meses (conta + cartão), ordenadas da mais nova para a mais antiga. */
  transactions: Transaction[];
};

// ---------------------------------------------------------------------------
// Investimentos (XP) e cripto (Binance)
// ---------------------------------------------------------------------------

export type AssetClass = "renda_fixa" | "acoes" | "exterior" | "cripto" | "caixa";

export type InvestmentPosition = {
  id: string;
  name: string;
  ticker?: string;
  /** Instituição onde o investimento está (Santander, XP...). */
  institution?: string;
  /** Conexão do Open Finance de onde a posição veio (rótulo do item: "Santander", "XP"). */
  connection?: string;
  assetClass: AssetClass;
  quantity: number | null;
  avgPrice: number | null;
  currentPrice: number | null;
  /** Valor atual em R$. */
  value: number;
  /** Total investido em R$ (custo), quando conhecido. */
  invested: number | null;
  /** Fração da quantidade com custo conhecido pelo histórico (quando o custo veio das movimentações). */
  costCoverage?: number;
  /** Origem do valor: Open Finance (Pluggy) ou cotação atual da B3 (brapi). */
  priceSource: "pluggy" | "brapi" | "demo";
  /** Renda fixa: datas e remuneração, quando o Open Finance informa. */
  fixedIncome?: {
    purchaseDate?: ISODate;
    dueDate?: ISODate;
    /** Fim da carência: a partir desta data dá para resgatar. */
    liquidFrom?: ISODate;
    /** Ex.: "100% do CDI", "12,5% a.a.", "IPCA + 6% a.a." */
    rateLabel?: string;
  };
  updatedAt?: string;
};

export type CryptoHolding = {
  asset: string;
  spot: number;
  earn: number;
  quantity: number;
  priceBrl: number;
  priceUsd: number;
  valueBrl: number;
  valueUsd: number;
  /** Preço médio calculado pelo histórico da Binance (null se não houver compras rastreáveis). */
  avgPriceUsd: number | null;
  pnlUsd: number | null;
  pnlBrl: number | null;
  pnlPct: number | null;
  /** Fração da quantidade atual com custo conhecido (0 a 1). */
  costCoverage: number;
};

export type CryptoSnapshot = {
  holdings: CryptoHolding[];
  totalBrl: number;
  totalUsd: number;
  usdBrl: number;
};

export type PriceMap = Record<string, number>;

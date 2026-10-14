/** Subconjunto dos tipos da API da Pluggy usados pelo MyMoney (ver docs.pluggy.ai). */

export type PluggyPage<T> = { total: number; totalPages: number; page: number; results: T[] };
export type PluggyCursorPage<T> = { results: T[]; next: string | null };

export type PluggyItem = {
  id: string;
  status: string; // UPDATED | UPDATING | LOGIN_ERROR | OUTDATED | WAITING_USER_INPUT ...
  executionStatus?: string;
  lastUpdatedAt: string | null;
  connector: { id: number; name: string; imageUrl?: string };
};

export type PluggyAccount = {
  id: string;
  itemId: string;
  type: "BANK" | "CREDIT";
  subtype: "CHECKING_ACCOUNT" | "SAVINGS_ACCOUNT" | "CREDIT_CARD";
  name: string;
  marketingName: string | null;
  number: string;
  balance: number;
  bankData: {
    closingBalance: number | null;
    automaticallyInvestedBalance: number | null;
    hasReservedBalance?: boolean | null;
    reservedBalances?:
      | { name: string | null; identification: string; availableAmounts: { amount: number }[] }[]
      | null;
  } | null;
  creditData: {
    level: string | null;
    brand: string | null;
    balanceCloseDate: string | null;
    balanceDueDate: string | null;
    availableCreditLimit: number | null;
    creditLimit: number | null;
    minimumPayment: number | null;
  } | null;
};

export type PluggyTransaction = {
  id: string;
  accountId: string;
  date: string;
  description: string;
  descriptionRaw: string | null;
  amount: number;
  type: "DEBIT" | "CREDIT";
  status?: "PENDING" | "POSTED";
  category: string | null;
  categoryId: string | null;
  paymentData?: {
    payer?: { name?: string };
    receiver?: { name?: string };
    paymentMethod?: string;
  } | null;
  merchant?: { name?: string; businessName?: string } | null;
  creditCardMetadata?: {
    installmentNumber?: number;
    totalInstallments?: number;
    totalAmount?: number;
    purchaseDate?: string;
    billId?: string;
    billForecastDate?: string;
    billPostDate?: string | null;
  } | null;
};

export type PluggyBill = {
  id: string;
  dueDate: string;
  billClosingDate?: string | null;
  totalAmount: number;
  minimumPaymentAmount: number | null;
};

export type PluggyCategory = {
  id: string;
  description: string;
  descriptionTranslated?: string;
  parentId?: string;
  parentDescription?: string;
};

export type PluggyInvestmentTransaction = {
  id: string;
  type: "BUY" | "SELL" | "TAX" | "TRANSFER" | null;
  movementType: "DEBIT" | "CREDIT";
  quantity: number | null;
  value: number | null;
  amount: number | null;
  netAmount: number | null;
  date: string;
};

export type PluggyInvestment = {
  id: string;
  code: string | null;
  isin: string | null;
  name: string;
  type: "MUTUAL_FUND" | "SECURITY" | "EQUITY" | "COE" | "FIXED_INCOME" | "ETF" | "OTHER";
  subtype: string | null;
  status?: "ACTIVE" | "PENDING" | "TOTAL_WITHDRAWAL";
  balance: number;
  amount: number | null;
  amountOriginal: number | null;
  amountProfit: number | null;
  quantity: number | null;
  value: number | null;
  date: string | null;
  dueDate: string | null;
  /** Renda fixa: data da aplicação, fim da carência e remuneração. */
  purchaseDate?: string | null;
  issueDate?: string | null;
  gracePeriodDate?: string | null;
  rate?: number | null;
  rateType?: string | null;
  fixedAnnualRate?: number | null;
  /** Instituição que custodia o investimento (ex.: "BANCO SANTANDER (BRASIL) S.A."). */
  institution?: { name: string | null; number: string | null } | null;
};

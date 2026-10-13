import "server-only";
import type {
  AssetClass,
  BankAccount,
  CardBill,
  CreditCard,
  InvestmentPosition,
  Transaction,
  TransactionKind,
  TransactionSource,
} from "@/domain/types";
import { inferForecastOffset } from "@/domain/credit-card";
import { addMonths, monthOf, toSPDate } from "@/lib/dates";
import type {
  PluggyAccount,
  PluggyBill,
  PluggyCategory,
  PluggyInvestment,
  PluggyInvestmentTransaction,
  PluggyTransaction,
} from "./types";

/** Tradução de reserva caso a categoria não venha com `descriptionTranslated`. */
const CATEGORY_PT: Record<string, string> = {
  Income: "Renda",
  "Loans and financing": "Empréstimos",
  Investments: "Investimentos",
  "Same person transfer": "Transferência própria",
  Transfers: "Transferências",
  "Third-party transfers": "Transferências",
  "Legal obligations": "Obrigações legais",
  Services: "Serviços",
  Shopping: "Compras",
  "Digital services": "Serviços digitais",
  Groceries: "Supermercado",
  "Food and drinks": "Alimentação",
  Travel: "Viagem",
  Donations: "Doações",
  Gambling: "Apostas",
  Taxes: "Impostos",
  "Bank fees": "Tarifas bancárias",
  Housing: "Moradia",
  Utilities: "Contas da casa",
  Healthcare: "Saúde",
  Transportation: "Transporte",
  Automotive: "Automotivo",
  Insurance: "Seguros",
  Leisure: "Lazer",
  Education: "Educação",
  Telecommunications: "Telecomunicações",
};

export type CategoryIndex = Map<string, PluggyCategory>;

export function indexCategories(categories: PluggyCategory[]): CategoryIndex {
  return new Map(categories.map((c) => [c.id, c]));
}

function resolveCategory(t: PluggyTransaction, index: CategoryIndex): { label: string; parentEn: string | null } {
  const cat = t.categoryId ? index.get(t.categoryId) : undefined;
  if (cat) {
    const parent = cat.parentId ? index.get(cat.parentId) : undefined;
    const parentEn = cat.parentDescription ?? (cat.parentId ? (parent?.description ?? null) : cat.description);
    const label =
      (cat.parentId ? parent?.descriptionTranslated : cat.descriptionTranslated) ??
      (parentEn ? CATEGORY_PT[parentEn] : undefined) ??
      parentEn ??
      "Outros";
    return { label, parentEn };
  }
  if (t.category) return { label: CATEGORY_PT[t.category] ?? t.category, parentEn: t.category };
  return { label: "Outros", parentEn: null };
}

const CARD_PAYMENT_RE = /(PAG(AMENTO|TO)?|PGTO)\s*(DE\s*)?(FATURA|CART)/i;

function resolveKind(t: PluggyTransaction, source: TransactionSource, parentEn: string | null): TransactionKind {
  const cat = t.category ?? "";
  if (/credit card payment/i.test(cat) || CARD_PAYMENT_RE.test(t.description)) return "card-payment";
  // No cartão, todo crédito que não é estorno de compra é pagamento da fatura.
  if (source === "cartao" && t.type === "CREDIT" && /PAGAMENTO|PAGTO|PGTO/i.test(t.description)) return "card-payment";
  if (/same person transfer/i.test(cat) || parentEn === "Same person transfer") return "internal";
  if (parentEn === "Investments" && !/dividend|interest/i.test(cat)) return "investment";
  return "regular";
}

function parseInstallmentFromText(desc: string): { number: number; total: number } | undefined {
  const m = desc.match(/PARC(?:ELA)?\.?\s*(\d{1,2})\s*(?:\/|DE)\s*(\d{1,2})/i) ?? desc.match(/\s(\d{2})\/(\d{2})\s*$/);
  if (!m) return undefined;
  const number = Number(m[1]);
  const total = Number(m[2]);
  return total >= 2 && total <= 48 && number >= 1 && number <= total ? { number, total } : undefined;
}

export function mapTransaction(
  t: PluggyTransaction,
  source: TransactionSource,
  categories: CategoryIndex,
  billing: BillingContext,
): Transaction {
  const { label, parentEn } = resolveCategory(t, categories);
  // A Pluggy normaliza o `type` (inclusive no cartão: compra = DEBIT, pagamento = CREDIT).
  const amount = t.type === "DEBIT" ? -Math.abs(t.amount) : Math.abs(t.amount);
  const cc = t.creditCardMetadata ?? undefined;

  const installmentFromMeta =
    cc?.installmentNumber && cc.totalInstallments && cc.totalInstallments > 1
      ? { number: cc.installmentNumber, total: cc.totalInstallments }
      : undefined;
  const inst = installmentFromMeta ?? (source === "cartao" ? parseInstallmentFromText(t.description) : undefined);
  const purchaseDate = cc?.purchaseDate ? toSPDate(cc.purchaseDate) : undefined;

  let date = toSPDate(t.date);
  // Parcelas 2..N: usa a data de lançamento na fatura, quando o banco informa.
  if (inst && inst.number > 1 && cc?.billPostDate) date = cc.billPostDate.slice(0, 10);

  // Fatura confirmada (billId) tem prioridade; depois a previsão, corrigida pelo deslocamento aprendido.
  const forecast = cc?.billForecastDate && /^\d{4}-\d{2}$/.test(cc.billForecastDate) ? cc.billForecastDate : undefined;
  const billMonth =
    (cc?.billId ? billing.byId.get(cc.billId) : undefined) ??
    (forecast && billing.forecastOffset !== null ? addMonths(forecast, billing.forecastOffset) : undefined);

  const counterpart =
    (t.type === "DEBIT" ? t.paymentData?.receiver?.name : t.paymentData?.payer?.name) ??
    t.merchant?.name ??
    undefined;

  return {
    id: t.id,
    date,
    description: (t.description || t.descriptionRaw || "").trim(),
    amount: Math.round(amount * 100) / 100,
    source,
    kind: resolveKind(t, source, parentEn),
    category: label,
    categoryRaw: t.category,
    categoryId: t.categoryId,
    status: t.status === "PENDING" ? "pending" : "posted",
    counterpart: counterpart || undefined,
    paymentMethod: t.paymentData?.paymentMethod,
    installment: inst ? { ...inst, purchaseDate } : undefined,
    billMonth,
  };
}

export function mapChecking(a: PluggyAccount): BankAccount {
  return {
    id: a.id,
    name: a.marketingName ?? a.name,
    balance: a.balance,
    reserved: (a.bankData?.reservedBalances ?? []).map((r) => ({
      name: r.name ?? "Saldo reservado",
      amount: r.availableAmounts.reduce((s, x) => s + x.amount, 0),
    })),
  };
}

export function mapCard(a: PluggyAccount): CreditCard {
  return {
    id: a.id,
    name: a.marketingName ?? a.name,
    brand: a.creditData?.brand ?? null,
    level: a.creditData?.level ?? null,
    creditLimit: a.creditData?.creditLimit ?? null,
    availableLimit: a.creditData?.availableCreditLimit ?? null,
    closeDate: a.creditData?.balanceCloseDate ? toSPDate(a.creditData.balanceCloseDate) : null,
    dueDate: a.creditData?.balanceDueDate ? toSPDate(a.creditData.balanceDueDate) : null,
  };
}

export function mapBill(b: PluggyBill): CardBill {
  return {
    id: b.id,
    dueDate: toSPDate(b.dueDate),
    closeDate: b.billClosingDate ? toSPDate(b.billClosingDate) : null,
    total: b.totalAmount,
    minimumPayment: b.minimumPaymentAmount,
  };
}

export type BillingContext = { byId: Map<string, string>; forecastOffset: number | null };

/** Índice billId → mês do vencimento + deslocamento do billForecastDate aprendido com os próprios dados. */
export function billingContext(bills: CardBill[], cardTxs: PluggyTransaction[]): BillingContext {
  const byId = new Map(bills.map((b) => [b.id, monthOf(b.dueDate)]));
  const samples = cardTxs.flatMap((t) => {
    const cc = t.creditCardMetadata;
    const dueMonth = cc?.billId ? byId.get(cc.billId) : undefined;
    return cc?.billForecastDate && dueMonth ? [{ forecast: cc.billForecastDate, dueMonth }] : [];
  });
  return { byId, forecastOffset: inferForecastOffset(samples) };
}

const EXTERIOR_RE = /AMERICAN|GLOBAL|USA|EUA|EXTERIOR|INTERNACIONAL|S&P|NASDAQ|OFFSHORE/i;

function investmentClass(i: PluggyInvestment): AssetClass {
  if (EXTERIOR_RE.test(i.name) || i.subtype === "OFFSHORE_FUND" || i.subtype === "BDR") return "exterior";
  if (i.type === "EQUITY" || i.type === "ETF" || i.subtype === "STOCK_FUND") return "acoes";
  return "renda_fixa";
}

function extractTicker(i: PluggyInvestment): string | undefined {
  const candidates = [i.code ?? "", i.name];
  for (const c of candidates) {
    const m = c.toUpperCase().match(/\b([A-Z]{4}\d{1,2})\b/);
    if (m) return m[1];
  }
  return undefined;
}

/** "BANCO SANTANDER (BRASIL) S.A." → "Santander"; "XP INVESTIMENTOS CCTVM S/A" → "XP Investimentos". */
export function shortInstitution(name: string): string {
  const noise = new Set(["BANCO", "S", "A", "SA", "CCTVM", "DTVM", "LTDA", "CORRETORA", "DE", "VALORES", "MOBILIARIOS", "TITULOS"]);
  const words = name
    .replace(/\(.*?\)/g, " ") // "(BRASIL)"
    .replace(/[^\p{L}\d ]/gu, " ")
    .split(/\s+/)
    .filter((w) => w && !noise.has(w.toUpperCase()))
    .slice(0, 2);
  return words.map((w) => (w.length <= 3 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1).toLowerCase())).join(" ");
}

const TREASURY_NAMES: Record<string, string> = {
  LFT: "Tesouro Selic",
  LTN: "Tesouro Prefixado",
  "NTN-F": "Tesouro Prefixado com Juros Semestrais",
  "NTN-B": "Tesouro IPCA+ com Juros Semestrais",
  "NTN-B PRINCIPAL": "Tesouro IPCA+",
  NTNB: "Tesouro IPCA+ com Juros Semestrais",
};

/** "LFT" + vencimento 2031 → "Tesouro Selic 2031". */
function investmentName(i: PluggyInvestment): string {
  const official = TREASURY_NAMES[i.name.trim().toUpperCase()];
  if (i.subtype === "TREASURY" && official) return `${official}${i.dueDate ? ` ${i.dueDate.slice(0, 4)}` : ""}`;
  return i.name.replace(/\s+CIA RL$/i, "").trim();
}

/** Custo médio pelas movimentações de compra/venda (método do custo médio). */
export function costFromTransactions(txs: PluggyInvestmentTransaction[]): { qty: number; cost: number } {
  let qty = 0;
  let cost = 0;
  for (const t of [...txs].sort((a, b) => (a.date < b.date ? -1 : 1))) {
    const q = t.quantity ?? 0;
    if (q <= 0) continue;
    if (t.type === "BUY") {
      qty += q;
      cost += t.netAmount ?? t.amount ?? q * (t.value ?? 0);
    } else if (t.type === "SELL" && qty > 0) {
      const sold = Math.min(q, qty);
      cost -= (cost / qty) * sold;
      qty -= sold;
    }
  }
  return { qty, cost };
}

/** Abaixo disso, o histórico não explica a posição e o resultado seria enganoso. */
const MIN_COST_COVERAGE = 0.95;

export function mapInvestment(
  i: PluggyInvestment,
  fallbackInstitution: string,
  history?: PluggyInvestmentTransaction[],
): InvestmentPosition | null {
  if (i.status === "TOTAL_WITHDRAWAL" || i.balance <= 0) return null;
  const assetClass = investmentClass(i);
  const isEquity = i.type === "EQUITY" || i.type === "ETF";
  const quantity = i.quantity ?? null;
  let invested = i.amountOriginal ?? null;
  let costCoverage: number | undefined;
  if (invested == null && history?.length && quantity) {
    const { qty, cost } = costFromTransactions(history);
    costCoverage = Math.min(qty / quantity, 1);
    if (costCoverage >= MIN_COST_COVERAGE) invested = (cost / qty) * quantity;
  }
  return {
    id: `pluggy-${i.id}`,
    name: investmentName(i),
    ticker: isEquity ? extractTicker(i) : undefined,
    institution: i.institution?.name ? shortInstitution(i.institution.name) : fallbackInstitution,
    assetClass,
    quantity,
    avgPrice: isEquity && invested && quantity ? invested / quantity : null,
    currentPrice: isEquity ? (i.value ?? null) : null,
    value: i.balance,
    invested,
    costCoverage,
    priceSource: "pluggy",
    updatedAt: i.date ?? undefined,
  };
}

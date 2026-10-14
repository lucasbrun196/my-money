import "server-only";
import { billDates, billMonthForDate } from "@/domain/credit-card";
import type { CostBasis, CryptoBalance, CryptoPrices } from "@/domain/crypto";
import type { BankSnapshot, CardBill, InvestmentPosition, ISODate, Transaction } from "@/domain/types";
import { addDays, addMonths, clampedDate, daysInMonth, monthOf, weekday } from "@/lib/dates";

/**
 * Dados fictícios (DEMO_MODE=true) para desenvolver a interface sem
 * credenciais. Gerador determinístico: o mesmo dia gera os mesmos dados.
 */

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MERCHANTS = [
  { desc: "DELIVERY DE COMIDA", cat: "Alimentação", min: 28, max: 75, w: 3 },
  { desc: "SUPERMERCADO EXEMPLO", cat: "Supermercado", min: 45, max: 210, w: 2 },
  { desc: "APP DE TRANSPORTE", cat: "Transporte", min: 12, max: 38, w: 3 },
  { desc: "POSTO DE COMBUSTIVEL", cat: "Transporte", min: 80, max: 170, w: 0.8 },
  { desc: "RESTAURANTE EXEMPLO", cat: "Alimentação", min: 35, max: 95, w: 1.5 },
  { desc: "FARMACIA EXEMPLO", cat: "Saúde", min: 18, max: 90, w: 1 },
  { desc: "LOJA ONLINE", cat: "Compras", min: 40, max: 180, w: 0.6 },
  { desc: "CINEMA EXEMPLO", cat: "Lazer", min: 30, max: 70, w: 0.5 },
  { desc: "PADARIA EXEMPLO", cat: "Alimentação", min: 8, max: 25, w: 2 },
  { desc: "PIX ENVIADO", cat: "Transferências", min: 20, max: 80, w: 0.6, counterpart: "BELTRANO DA SILVA", conta: true },
];
const WEIGHT_SUM = MERCHANTS.reduce((s, m) => s + m.w, 0);

const INSTALLMENT_PURCHASES = [
  { desc: "LOJA DE ELETRONICOS", amount: 189.9, total: 10, monthsAgo: 4, day: 22, cat: "Compras" },
  { desc: "LOJA DE INFORMATICA", amount: 75.5, total: 6, monthsAgo: 2, day: 9, cat: "Compras" },
  { desc: "LOJA DE ESPORTES", amount: 99.97, total: 3, monthsAgo: 1, day: 16, cat: "Compras" },
];

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Ciclo fictício do cartão do modo demo (no modo real ele é aprendido das faturas). */
const DEMO_CYCLE = { closingDay: 3, dueDay: 10 };

/** Dia útil mais próximo antes (sábado/domingo voltam para sexta). */
function businessDay(iso: ISODate): ISODate {
  const wd = weekday(iso);
  return wd === 6 ? addDays(iso, -1) : wd === 0 ? addDays(iso, -2) : iso;
}

export function demoBankSnapshot(today: ISODate): BankSnapshot {
  const rand = rng(Number(today.replaceAll("-", "").slice(0, 6)));
  const card = DEMO_CYCLE;
  const txs: Transaction[] = [];
  let seq = 0;
  const add = (t: Omit<Transaction, "id" | "status" | "categoryRaw" | "categoryId"> & Partial<Transaction>) => {
    if (t.date > today) return;
    txs.push({ id: `demo-${++seq}`, status: "posted", categoryRaw: null, categoryId: null, ...t });
  };

  const firstMonth = addMonths(monthOf(today), -12);
  for (let i = 0; i <= 12; i++) {
    const ym = addMonths(firstMonth, i);
    const [y, m] = ym.split("-").map(Number);

    add({ date: businessDay(clampedDate(y, m, 5)), description: "PAGAMENTO DE SALARIO EMPRESA EXEMPLO", amount: 3150, source: "conta", kind: "regular", category: "Renda", counterpart: "EMPRESA EXEMPLO LTDA" });
    add({ date: businessDay(clampedDate(y, m, 20)), description: "ADIANTAMENTO SALARIAL EMPRESA EXEMPLO", amount: 2100, source: "conta", kind: "regular", category: "Renda", counterpart: "EMPRESA EXEMPLO LTDA" });
    add({ date: clampedDate(y, m, 30), description: "STREAMING DE MUSICA", amount: -21.9, source: "conta", kind: "regular", category: "Serviços digitais" });
    add({ date: clampedDate(y, m, 12), description: "PIX ENVIADO", amount: -650, source: "conta", kind: "regular", category: "Transferências", counterpart: "FULANA DE TAL", paymentMethod: "PIX" });
    add({ date: clampedDate(y, m, 6), description: "APLICACAO TESOURO DIRETO", amount: -500, source: "conta", kind: "investment", category: "Investimentos" });
    add({ date: clampedDate(y, m, 15), description: "ASSINATURA DE SOFTWARE", amount: -89.9, source: "cartao", kind: "regular", category: "Serviços digitais", billMonth: billMonthForDate(clampedDate(y, m, 15), card) });
    add({ date: clampedDate(y, m, 8), description: "CLUBE ESPORTIVO SOCIO", amount: -60, source: "cartao", kind: "regular", category: "Lazer", billMonth: billMonthForDate(clampedDate(y, m, 8), card) });

    for (let d = 1; d <= daysInMonth(y, m); d++) {
      const date = clampedDate(y, m, d);
      const n = rand() < 0.4 ? 0 : rand() < 0.82 ? 1 : 2;
      for (let k = 0; k < n; k++) {
        let pick = rand() * WEIGHT_SUM;
        const mer = MERCHANTS.find((x) => (pick -= x.w) <= 0) ?? MERCHANTS[0];
        const amount = r2(mer.min + rand() * (mer.max - mer.min));
        const onCard = !mer.conta && rand() < 0.7;
        add({
          date,
          description: mer.desc,
          amount: -amount,
          source: onCard ? "cartao" : "conta",
          kind: "regular",
          category: mer.cat,
          counterpart: mer.counterpart,
          paymentMethod: mer.conta ? "PIX" : undefined,
          billMonth: onCard ? billMonthForDate(date, card) : undefined,
        });
      }
    }
  }

  // Compras parceladas: o banco só entrega as parcelas já lançadas (até a fatura atual).
  const currentBill = billMonthForDate(today, card);
  for (const p of INSTALLMENT_PURCHASES) {
    const ym = addMonths(monthOf(today), -p.monthsAgo);
    const [y, m] = ym.split("-").map(Number);
    const purchaseDate = clampedDate(y, m, p.day);
    const firstBill = billMonthForDate(purchaseDate, card);
    for (let k = 1; k <= p.total; k++) {
      const billMonth = addMonths(firstBill, k - 1);
      if (billMonth > currentBill) break;
      add({
        date: purchaseDate,
        description: `${p.desc} PARC ${String(k).padStart(2, "0")}/${String(p.total).padStart(2, "0")}`,
        amount: -p.amount,
        source: "cartao",
        kind: "regular",
        category: p.cat,
        installment: { number: k, total: p.total, purchaseDate },
        billMonth,
      });
    }
  }

  // Faturas fechadas e seus pagamentos.
  const bills: CardBill[] = [];
  for (let i = 1; i <= 12; i++) {
    const month = addMonths(currentBill, -i);
    const total = r2(-txs.filter((t) => t.source === "cartao" && t.billMonth === month).reduce((s, t) => s + t.amount, 0));
    if (total <= 0) continue;
    const { closeDate, dueDate } = billDates(month, card);
    if (closeDate > today) continue;
    bills.push({ id: `bill-${month}`, dueDate, closeDate, total, minimumPayment: r2(total * 0.15) });
    add({ date: dueDate, description: "PAGAMENTO FATURA CARTAO", amount: -total, source: "conta", kind: "card-payment", category: "Transferências" });
    add({ date: dueDate, description: "PAGAMENTO RECEBIDO", amount: total, source: "cartao", kind: "card-payment", category: "Transferências", billMonth: month });
  }

  txs.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return {
    connection: { institution: "Banco (demo)", status: "UPDATED", lastSyncAt: `${today}T09:12:00.000Z` },
    checking: {
      id: "demo-checking",
      name: "Conta Corrente (demo)",
      balance: 3247.18,
      reserved: [{ name: "Caixinha Viagem", amount: 1850 }],
    },
    card: {
      id: "demo-card",
      name: "CARTAO DE CREDITO (DEMO)",
      brand: "MASTERCARD",
      level: "PLATINUM",
      creditLimit: 12000,
      availableLimit: 9614.32,
      closeDate: null,
      dueDate: null,
    },
    bills: bills.sort((a, b) => (a.dueDate < b.dueDate ? 1 : -1)),
    transactions: txs,
  };
}

/** Carteira fictícia do modo demo. */
export function demoPositions(): InvestmentPosition[] {
  const stock = (ticker: string, quantity: number, avgPrice: number, price: number): InvestmentPosition => ({
    id: `demo-${ticker}`,
    name: ticker,
    ticker,
    assetClass: "acoes",
    quantity,
    avgPrice,
    currentPrice: price,
    value: r2(quantity * price),
    invested: r2(quantity * avgPrice),
    priceSource: "demo",
    institution: "Corretora (demo)",
  });
  return [
    { id: "demo-selic", name: "Tesouro Selic 2030", assetClass: "renda_fixa", quantity: null, avgPrice: null, currentPrice: null, value: 11240.5, invested: 10500, priceSource: "demo", institution: "Corretora (demo)", connection: "XP" },
    { id: "demo-reserva-1", name: "CDB Banco Exemplo", assetClass: "renda_fixa", quantity: null, avgPrice: null, currentPrice: null, value: 2500, invested: 2400, priceSource: "demo", institution: "Banco (demo)", connection: "Santander", fixedIncome: { purchaseDate: "2026-02-10", dueDate: "2030-02-10", liquidFrom: "2026-02-11", rateLabel: "100% do CDI" } },
    { id: "demo-reserva-2", name: "CDB Banco Exemplo", assetClass: "renda_fixa", quantity: null, avgPrice: null, currentPrice: null, value: 1200, invested: 1180, priceSource: "demo", institution: "Banco (demo)", connection: "Santander", fixedIncome: { purchaseDate: "2026-07-01", dueDate: "2030-07-01", liquidFrom: "2026-07-02", rateLabel: "100% do CDI" } },
    stock("ABCD3", 150, 18.4, 21.3),
    stock("EFGH4", 200, 31.2, 29.75),
    stock("IJKL3", 90, 12.6, 15.1),
    stock("MNOP3", 300, 6.8, 7.45),
    { id: "demo-fundo", name: "Fundo de Ações Globais", assetClass: "exterior", quantity: null, avgPrice: null, currentPrice: null, value: 3050, invested: 2600, priceSource: "demo", institution: "Corretora (demo)" },
  ];
}

export function demoCrypto(): { balances: CryptoBalance[]; prices: CryptoPrices; basis: Record<string, CostBasis> } {
  return {
    balances: [
      { asset: "BTC", spot: 0.006, earn: 0.004 },
      { asset: "SOL", spot: 2.5, earn: 0 },
    ],
    prices: { brl: { BTC: 611_850, SOL: 1_074.3 }, usd: { BTC: 112_480, SOL: 197.42 }, usdBrl: 5.44 },
    basis: { BTC: { avgPriceUsd: 95000, trackedQty: 0.0095 }, SOL: { avgPriceUsd: 150, trackedQty: 2.5 } },
  };
}

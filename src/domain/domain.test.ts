import { describe, expect, it } from "vitest";
import { billMonthForDate, billReferenceMonth, inferCardCycle, inferForecastOffset, summarizeCard } from "./credit-card";
import { buildBillCycles, compareBills } from "./compare";
import { averageCost, buildCryptoSnapshot } from "./crypto";
import { summarizeReserves } from "./reserves";
import { previousComparable } from "./periods";
import { detectRecurring, matchRecurring } from "./recurring";
import { detectSalary, summarizeSalary } from "./salary";
import { buildExpenses } from "./spending";
import type { CardBill, Transaction } from "./types";
import { brl, pct, signedBrl } from "@/lib/format";

let seq = 0;
function tx(partial: Partial<Transaction> & Pick<Transaction, "date" | "amount">): Transaction {
  return {
    id: `t${++seq}`,
    description: "COMPRA",
    source: "conta",
    kind: "regular",
    category: "Outros",
    categoryRaw: null,
    categoryId: null,
    status: "posted",
    ...partial,
  };
}

const EMPLOYER = "EMPRESA EXEMPLO S.A.";
// O CNPJ no texto varia de um mês para outro (dado real); o pagador é o mesmo.
const salary = (date: string, amount: number, cnpj = "12345678000190") =>
  tx({ date, amount, description: `CREDITO DE SALARIO EMPRESA EXEMPLO ${cnpj}`, counterpart: EMPLOYER });

const CYCLE = { closingDay: 3, dueDay: 10 };

describe("formatação pt-BR", () => {
  it("formata reais no padrão brasileiro", () => {
    expect(brl(1234.56)).toBe("R$ 1.234,56");
    expect(signedBrl(-54)).toBe("−R$ 54,00");
    expect(pct(0.1234)).toBe("12,34%");
  });
});

describe("ciclo do cartão", () => {
  it("é aprendido das faturas (mediana: o banco varia o fechamento entre os dias 2 e 5)", () => {
    const bill = (due: string, close: string): CardBill => ({ id: due, dueDate: due, closeDate: close, total: 100, minimumPayment: null });
    const bills = [bill("2026-10-10", "2026-10-05"), bill("2026-09-10", "2026-09-02"), bill("2026-08-10", "2026-08-03"), bill("2026-07-10", "2026-07-03")];
    expect(inferCardCycle(bills, null)).toEqual({ closingDay: 3, dueDay: 10 });
  });
  it("compra até o fechamento cai na fatura do mês; depois, na seguinte", () => {
    expect(billMonthForDate("2026-10-03", CYCLE)).toBe("2026-10");
    expect(billMonthForDate("2026-10-04", CYCLE)).toBe("2026-11");
    expect(billMonthForDate("2026-12-20", CYCLE)).toBe("2027-01");
  });
});

describe("salário detectado pelos dados", () => {
  const txs = [
    salary("2026-07-04", 2400, "01234567800019"),
    salary("2026-07-18", 1700),
    salary("2026-08-06", 3100, "01234567800019"),
    salary("2026-08-20", 1800),
    salary("2026-09-04", 2600),
    salary("2026-09-19", 1800),
    salary("2026-10-06", 2300),
    tx({ date: "2026-10-06", amount: 500, description: "PIX RECEBIDO", counterpart: "FULANO", paymentMethod: "PIX" }),
    tx({ date: "2026-09-06", amount: 300, description: "PIX RECEBIDO", counterpart: "FULANO", paymentMethod: "PIX" }),
  ];
  const profile = detectSalary(txs, "2026-10-13")!;

  it("acha o empregador (maior renda recorrente) mesmo com o CNPJ variando", () => {
    expect(profile.employer).toMatch(/^Empresa Exemplo/);
    expect(profile.payments).toHaveLength(7);
  });

  it("aprende as duas partes e os dias de pagamento", () => {
    expect(profile.parts.map((p) => [p.label, p.day])).toEqual([
      ["Saldo", 5],
      ["Adiantamento", 19],
    ]);
  });

  it("estima o próximo valor pelo último pagamento da mesma parte", () => {
    expect(summarizeSalary("2026-10-13", profile).next).toMatchObject({ label: "Adiantamento", estimatedAmount: 1800 });
  });
});

describe("gastos fixos detectados automaticamente", () => {
  const today = "2026-10-13";
  const months = ["2026-06", "2026-07", "2026-08", "2026-09", "2026-10"];
  const txs: Transaction[] = [
    // Streaming cobrado por um intermediário de pagamento, todo mês
    ...months.map((m) => tx({ date: `${m}-02`, amount: -21.9, description: "STREAMING DE MUSICA" })),
    // PIX mensal para a mesma pessoa + PIX avulsos menores para ela
    ...months.map((m) => tx({ date: `${m}-07`, amount: -650, description: "PIX ENVIADO Fulana de Tal", paymentMethod: "PIX" })),
    tx({ date: "2026-09-20", amount: -30, description: "PIX ENVIADO Fulana de Tal", paymentMethod: "PIX" }),
    // Claude no cartão com variação de câmbio (jun–set; a de outubro ainda não caiu)
    ...[99.9, 98.5, 98.2, 98.1].map((v, i) => tx({ date: `${months[i]}-12`, amount: -v, source: "cartao", description: "ASSINATURA* SOFTWARE PRO" })),
    // Delivery: várias vezes por mês → consumo, não é gasto fixo
    ...months.flatMap((m) => [5, 12, 19].map((d) => tx({ date: `${m}-${d}`, amount: -45, description: "DELIVERY *COMIDA" }))),
    // Assinatura cancelada (última cobrança em junho)
    ...["2026-03", "2026-04", "2026-05", "2026-06"].map((m) => tx({ date: `${m}-10`, amount: -39.9, description: "STREAMING DE VIDEO" })),
  ];
  const recurring = detectRecurring(txs, today);

  it("encontra assinaturas e PIX recorrentes, ignora consumo frequente e cancelados", () => {
    expect(recurring.map((r) => [r.name, r.amount, r.method]).sort()).toEqual(
      [
        ["Assinatura Software Pro", 98.1, "cartao"],
        ["Streaming De Musica", 21.9, "debito"],
        ["Fulana De Tal", 650, "pix"],
      ].sort(),
    );
  });

  it("corridas de app (valor parecido, mas em dias aleatórios) não viram gasto fixo", () => {
    const rides = ["2026-08-03", "2026-08-30", "2026-09-22", "2026-10-09"].map((d) =>
      tx({ date: d, amount: -12.8, description: "APP DE CORRIDAS LTDA", paymentMethod: "PIX" }),
    );
    expect(detectRecurring(rides, today)).toEqual([]);
  });

  it("cobrança nova: 2 meses seguidos, mesmo valor e mesmo dia → recorrente marcado como recente", () => {
    const rent = ["2026-09-06", "2026-10-07"].map((d, i) =>
      tx({ date: d, amount: i ? -650 : -649.5, description: "PIX ENVIADO Beltrana", paymentMethod: "PIX" }),
    );
    expect(detectRecurring(rent, today)).toMatchObject([{ amount: 650, recent: true, method: "pix" }]);
  });

  it("o PIX avulso para a mesma pessoa continua sendo gasto variável", () => {
    const small = txs.find((t) => t.amount === -30)!;
    const rent = txs.find((t) => t.amount === -650)!;
    expect(matchRecurring(small, recurring)).toBeUndefined();
    expect(matchRecurring(rent, recurring)?.method).toBe("pix");
  });
});

describe("gastos", () => {
  it("ignora pagamento de fatura, transferência própria e entradas", () => {
    const expenses = buildExpenses(
      [
        tx({ date: "2026-10-07", amount: -100, description: "MERCADO" }),
        tx({ date: "2026-10-10", amount: -2000, description: "PAGAMENTO FATURA", kind: "card-payment" }),
        tx({ date: "2026-10-11", amount: -1000, description: "TED MESMA TITULARIDADE", kind: "internal" }),
        tx({ date: "2026-10-12", amount: 50, description: "PIX RECEBIDO" }),
      ],
      [],
    );
    expect(expenses.map((e) => [e.description, e.amount])).toEqual([["MERCADO", 100]]);
  });
});

describe("fatura, parcelas futuras e prévia", () => {
  const today = "2026-10-13";
  const months = ["2026-07", "2026-08", "2026-09", "2026-10"];
  const txs: Transaction[] = [
    ...[1, 2, 3, 4, 5].map((n) =>
      tx({
        date: "2026-06-22",
        amount: -189.9,
        source: "cartao",
        description: `LOJA DE ELETRONICOS PARC ${String(n).padStart(2, "0")}/10`,
        installment: { number: n, total: 10, purchaseDate: "2026-06-22" },
      }),
    ),
    tx({ date: "2026-10-05", amount: -250, source: "cartao", description: "RESTAURANTE" }),
    // Clube já lançado na fatura aberta; streaming ainda não
    ...months.map((m) => tx({ date: `${m}-05`, amount: -54, source: "cartao", description: "CLUBE ESPORTIVO" })),
    ...months.slice(0, 3).map((m) => tx({ date: `${m}-20`, amount: -26.5, source: "cartao", description: "STREAMING DE FILMES" })),
  ];
  const recurring = detectRecurring(txs, today);
  const s = summarizeCard({ transactions: txs, today, cycle: CYCLE, recurring, waiverTarget: 2000, bills: [], card: null });

  it("fatura aberta (nov) soma compras do ciclo + parcela do mês", () => {
    expect(s.currentMonth).toBe("2026-11");
    expect(s.currentTotal).toBe(493.9); // 250 + 54 + 189,90
  });

  it("assinatura detectada e ainda não lançada entra na previsão", () => {
    expect(s.pendingFixed.map((p) => p.amount)).toEqual([26.5]);
    expect(s.forecastClose).toBe(520.4);
  });

  it("projeta as parcelas restantes sem duplicar as já lançadas", () => {
    const dec = s.upcoming[0];
    expect(dec.installments).toBe(189.9);
    expect(dec.fixed).toBe(80.5); // clube + streaming
    expect(s.plans[0]).toMatchObject({ description: "LOJA DE ELETRONICOS", current: 5, total: 10, endsIn: "2027-04" });
  });
});

describe("compras parceladas repetidas", () => {
  it("separa a mesma compra parcelada de anos diferentes", () => {
    const curso = (n: number, billMonth: string) =>
      tx({ date: "2026-01-01", amount: -39.9, source: "cartao", description: "CURSO ONLINE", installment: { number: n, total: 12 }, billMonth });
    const old = Array.from({ length: 12 }, (_, i) => curso(i + 1, `${i === 0 ? "2024-12" : `2025-${String(i).padStart(2, "0")}`}`));
    const s = summarizeCard({
      transactions: [...old, curso(10, "2026-10"), curso(11, "2026-11")],
      today: "2026-10-13",
      cycle: CYCLE,
      recurring: [],
      waiverTarget: 2000,
      bills: [],
      card: null,
    });
    expect(s.upcoming[0].installments).toBe(39.9);
    expect(s.plans).toHaveLength(1);
    expect(s.plans[0]).toMatchObject({ current: 11, total: 12, remaining: 1 });
  });
});

describe("billForecastDate do banco", () => {
  it("aprende o deslocamento real (Santander: previsão = mês anterior ao vencimento)", () => {
    expect(
      inferForecastOffset([
        { forecast: "2026-09", dueMonth: "2026-10" },
        { forecast: "2026-09", dueMonth: "2026-10" },
        { forecast: "2026-08", dueMonth: "2026-09" },
      ]),
    ).toBe(1);
  });
  it("sem amostras, não arrisca (null)", () => {
    expect(inferForecastOffset([])).toBeNull();
  });
});

describe("preço médio cripto pelo histórico", () => {
  it("custo médio ponderado; venda não muda o preço médio", () => {
    const basis = averageCost([
      { asset: "BTC", time: 1, qty: 0.01, priceUsd: 80000, side: "buy" },
      { asset: "BTC", time: 2, qty: 0.01, priceUsd: 100000, side: "buy" },
      { asset: "BTC", time: 3, qty: 0.005, priceUsd: 120000, side: "sell" },
    ]);
    expect(basis.BTC.avgPriceUsd).toBeCloseTo(90000);
    expect(basis.BTC.trackedQty).toBeCloseTo(0.015);
  });

  it("informa quanto da quantidade tem custo conhecido (rendimentos do Earn não têm)", () => {
    const snap = buildCryptoSnapshot(
      [{ asset: "BTC", spot: 0.01, earn: 0.0025 }],
      { brl: { BTC: 600000 }, usd: { BTC: 110000 }, usdBrl: 5.45 },
      { BTC: { avgPriceUsd: 90000, trackedQty: 0.01 } },
    );
    expect(snap.holdings[0].costCoverage).toBeCloseTo(0.8);
    expect(snap.holdings[0].pnlPct).toBeCloseTo(110000 / 90000 - 1);
  });

  it("sem histórico, não inventa resultado", () => {
    const snap = buildCryptoSnapshot([{ asset: "SOL", spot: 1, earn: 0 }], { brl: { SOL: 1000 }, usd: { SOL: 190 }, usdBrl: 5.4 }, {});
    expect(snap.holdings[0]).toMatchObject({ avgPriceUsd: null, pnlUsd: null, pnlPct: null });
  });
});

describe("comparação com o período anterior", () => {
  it("corta o mês anterior no mesmo dia quando o atual está em andamento", () => {
    expect(previousComparable("mes", "2026-10-13", "2026-10-13")).toEqual({ start: "2026-09-01", end: "2026-09-13", partial: true });
  });
  it("usa o período anterior inteiro quando o atual já terminou", () => {
    expect(previousComparable("mes", "2026-09-10", "2026-10-13")).toEqual({ start: "2026-08-01", end: "2026-08-31", partial: false });
  });
  it("não passa do fim do período anterior (31 de março × fevereiro)", () => {
    expect(previousComparable("mes", "2026-03-31", "2026-03-31").end).toBe("2026-02-28");
  });
});

describe("minhas reservas", () => {
  const pos = (id: string, value: number, connection: string, purchaseDate: string, invested: number | null = value) => ({
    id,
    name: "CDB Exemplo",
    assetClass: "renda_fixa" as const,
    quantity: null,
    avgPrice: null,
    currentPrice: null,
    value,
    invested,
    priceSource: "demo" as const,
    connection,
    fixedIncome: { purchaseDate, rateLabel: "100% do CDI" },
  });

  it("lista só a renda fixa da conexão do banco, numerada pela data de aplicação", () => {
    const r = summarizeReserves({
      connection: "Banco A",
      positions: [pos("b", 1, "Banco A", "2026-10-05"), pos("a", 1.02, "Banco A", "2026-09-28", 1), pos("x", 5000, "Corretora B", "2026-01-01")],
    });
    expect(r.items.map((i) => [i.id, i.label])).toEqual([
      ["a", "Reserva 1"],
      ["b", "Reserva 2"],
    ]);
    expect(r.total).toBe(2.02);
    expect(r.profit).toBe(0.02);
  });

  it("inclui saldos reservados da conta com o nome do banco; sem custo, não inventa rendimento", () => {
    const r = summarizeReserves({ connection: "Banco A", positions: [], reservedBalances: [{ name: "Caixinha", amount: 50 }] });
    expect(r.items[0].label).toBe("Caixinha");
    expect(r.profit).toBeNull();
  });
});

describe("nome e comparação das faturas", () => {
  it("o nome da fatura é o mês da maior parte do ciclo (como o banco chama)", () => {
    expect(billReferenceMonth("2026-09-02")).toBe("2026-08"); // ciclo 04/08 a 02/09
    expect(billReferenceMonth("2026-09-25")).toBe("2026-09"); // ciclo 26/08 a 25/09
  });

  const card = (date: string, amount: number) => tx({ date, amount, source: "cartao", description: "LOJA EXEMPLO" });
  const cycles = buildBillCycles({
    bills: [
      { id: "b9", dueDate: "2026-09-10", closeDate: "2026-09-02", total: 300, minimumPayment: null },
      { id: "b8", dueDate: "2026-08-10", closeDate: "2026-08-03", total: 999, minimumPayment: null },
    ],
    open: { key: "2026-10", closeDate: "2026-10-05", dueDate: "2026-10-10", total: 70 },
    cycle: CYCLE,
    transactions: [
      card("2026-08-02", -999), // fatura anterior (fechou 03/08)
      card("2026-08-05", -100),
      card("2026-08-20", -250),
      card("2026-08-21", 50), // estorno
      card("2026-09-04", -30),
      card("2026-09-20", -40),
      tx({ date: "2026-09-06", amount: 300, source: "cartao", description: "PAGAMENTO DE FATURA", kind: "card-payment" }),
    ],
  });

  it("monta os ciclos com o total do banco e o nome de referência", () => {
    expect(cycles.map((c) => [c.key, c.ref, c.start, c.close, c.total, c.open])).toEqual([
      ["2026-10", "2026-09", "2026-09-03", "2026-10-05", 70, true],
      ["2026-09", "2026-08", "2026-08-04", "2026-09-02", 300, false],
      ["2026-08", "2026-07", "2026-07-04", "2026-08-03", 999, false],
    ]);
    expect(cycles[1].count).toBe(2);
    expect(cycles[1].perDay.reduce((s, v) => s + v, 0)).toBe(300);
  });

  it("fatura aberta × anterior compara até o mesmo dia do ciclo", () => {
    const c = compareBills(cycles[0], cycles[1], "2026-09-20"); // 18º dia do ciclo aberto
    expect(c.sameDay).toEqual({ day: 18, a: 70, b: 300 }); // 100 + 250 − 50 de estorno até 21/08
    expect(c.a.cumulative[17]).toBe(70);
    expect(c.a.cumulative[18]).toBeNull();
  });
});

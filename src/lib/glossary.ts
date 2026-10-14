/**
 * Explicações curtas dos números do painel de indicadores, em linguagem
 * simples: o que o número é e o que ele muda na prática para quem investe.
 * A chave é o rótulo exibido (ver server/services/indicators.ts).
 */
export type GlossaryEntry = { what: string; impact: string };

const ENTRIES: Record<string, GlossaryEntry> = {
  Abertura: {
    what: "Preço do primeiro negócio do dia, quando a bolsa abriu às 10h.",
    impact: "Comparar com a cotação atual mostra se o ativo subiu ou caiu ao longo do pregão de hoje.",
  },
  "Fechamento anterior": {
    what: "Preço do último negócio do pregão anterior.",
    impact: "É a base da variação do dia: o \"+1,2% hoje\" é calculado em cima desse valor.",
  },
  "Máxima do dia": {
    what: "Maior preço negociado hoje.",
    impact: "Junto com a mínima, mostra o quanto o preço oscilou no dia. Uma faixa larga indica um dia nervoso.",
  },
  "Mínima do dia": {
    what: "Menor preço negociado hoje.",
    impact: "Junto com a máxima, mostra a oscilação do dia. Comprar perto da mínima saiu mais barato.",
  },
  "Mínima 52 semanas": {
    what: "Menor preço do último ano.",
    impact: "Se a cotação está perto dela, o ativo está \"barato\" em relação ao próprio último ano. Isso pode ser oportunidade ou sinal de problema.",
  },
  "Máxima 52 semanas": {
    what: "Maior preço do último ano.",
    impact: "Se a cotação está perto dela, o ativo está no topo do ano. Comprar ali costuma ter menos margem de alta.",
  },
  "P/L": {
    what: "Preço dividido pelo lucro por ação: quantos anos de lucro atual você paga ao comprar a ação.",
    impact: "Quanto menor, mais \"barata\" a ação em relação ao lucro. Compare com empresas do mesmo setor; P/L negativo significa prejuízo.",
  },
  LPA: {
    what: "Lucro por ação: o lucro dos últimos 12 meses dividido pelo número de ações.",
    impact: "É a parte do lucro que corresponde a cada ação sua. LPA crescendo ao longo do tempo é bom sinal.",
  },
  "Dividend yield (12m)": {
    what: "Quanto a ação pagou em proventos nos últimos 12 meses, em % do preço atual.",
    impact: "É o \"rendimento em dinheiro\" da ação. 7% ao ano, por exemplo, significa R$ 7 de proventos para cada R$ 100 investidos, sem vender nada.",
  },
  "Proventos por ação (12m)": {
    what: "Soma de dividendos e JCP pagos por ação nos últimos 12 meses.",
    impact: "Multiplicado pela sua quantidade de ações, dá quanto você recebeu (ou receberia) no período.",
  },
  "Último provento": {
    what: "Valor e data do último dividendo ou JCP pago por ação.",
    impact: "Mostra a frequência e o tamanho dos pagamentos. Para receber, é preciso ter a ação na data com, que vem antes do pagamento.",
  },
  "Seus proventos (12m, estimado)": {
    what: "Proventos por ação dos últimos 12 meses vezes a quantidade de ações que você tem hoje.",
    impact: "É uma estimativa de quanto essa ação te paga por ano. O valor real depende de quantas ações você tinha em cada data com.",
  },
  "Valor de mercado": {
    what: "Preço da ação vezes o total de ações da empresa: quanto a bolsa diz que a empresa vale.",
    impact: "Empresas grandes (dezenas de bilhões) costumam oscilar menos; as menores podem subir ou cair mais rápido.",
  },
  Volume: {
    what: "Quantidade de ações negociadas no dia.",
    impact: "Volume alto significa liquidez: é fácil comprar e vender sem mexer no preço.",
  },
  "Volume do dia": {
    what: "Quanto do ativo foi negociado nas últimas 24 horas.",
    impact: "Volume alto significa mercado ativo e preço mais confiável; volume baixo deixa o preço mais sujeito a saltos.",
  },
  "Sua posição": {
    what: "Quantas unidades você tem e quanto elas valem pela cotação atual.",
    impact: "É o seu dinheiro exposto a esse ativo: cada 1% de variação no preço muda esse valor em 1%.",
  },
  "Seu preço médio": {
    what: "Quanto você pagou, em média, por cada unidade, considerando todas as compras.",
    impact: "Cotação acima do preço médio significa lucro; abaixo, prejuízo (enquanto você não vender, é só no papel).",
  },
  "Data de referência": {
    what: "Data da última divulgação oficial desse indicador.",
    impact: "Taxas e índices não mudam todo dia: o valor mostrado vale desde essa data.",
  },
  "Há 12 meses": {
    what: "Valor do mesmo indicador um ano atrás.",
    impact: "Mostra a tendência: taxa subindo encarece empréstimos e melhora a renda fixa; caindo, o contrário.",
  },
  "Variação em 12 meses": {
    what: "Diferença, em pontos percentuais (p.p.), entre o valor atual e o de 12 meses atrás.",
    impact: "Selic ou CDI 1 p.p. maior faz cada R$ 10.000 em renda fixa render cerca de R$ 100 a mais por ano.",
  },
  "Vigente desde": {
    what: "Data em que o Banco Central definiu a taxa atual.",
    impact: "A Selic é revista a cada ~45 dias pelo Copom. Até a próxima reunião, os investimentos atrelados a ela rendem nessa taxa.",
  },
  Compra: {
    what: "Preço que o mercado paga por cada unidade da moeda (cotação comercial).",
    impact: "É uma referência: casas de câmbio e cartões cobram acima disso, somando spread e IOF.",
  },
  Venda: {
    what: "Preço para comprar cada unidade da moeda (cotação comercial).",
    impact: "Compras no exterior com cartão usam uma cotação próxima a essa, mais spread do banco e IOF.",
  },
  "R$ 100 compram": {
    what: "Quanto da moeda estrangeira R$ 100 compram na cotação comercial de venda.",
    impact: "Ajuda a ter noção do poder de compra numa viagem. Na prática você recebe um pouco menos, por causa das taxas.",
  },
};

/** IPCA do mês (MM/AAAA): o rótulo traz o mês, então é tratado à parte. */
const IPCA_MONTH: GlossaryEntry = {
  what: "Inflação oficial do mês, medida pelo IBGE.",
  impact: "Mostra quanto os preços subiram no mês. Investimentos que rendem abaixo da inflação fazem você perder poder de compra.",
};

export function explain(label: string): GlossaryEntry | undefined {
  if (label.startsWith("IPCA do mês")) return IPCA_MONTH;
  return ENTRIES[label];
}

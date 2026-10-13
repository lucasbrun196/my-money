/** Tags de cache: o botão "Atualizar" invalida todas de uma vez. */
export const CACHE_TAGS = {
  bank: "pluggy-bank",
  xp: "pluggy-xp",
  binance: "binance-balances",
  prices: "crypto-prices",
  quotes: "b3-quotes",
  reference: "reference-data",
} as const;

export const ALL_CACHE_TAGS = Object.values(CACHE_TAGS);

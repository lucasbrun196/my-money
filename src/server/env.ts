import "server-only";

/**
 * Leitura centralizada das variáveis de ambiente. Nada daqui chega ao
 * navegador: o pacote "server-only" quebra o build se algum Client
 * Component importar este arquivo.
 */
const read = (name: string) => {
  const v = process.env[name]?.trim();
  return v ? v : undefined;
};

export const env = {
  demoMode: read("DEMO_MODE") === "true",

  auth: {
    secret: read("AUTH_SECRET"),
    passwordHash: read("AUTH_PASSWORD_HASH"),
    sessionDays: Number(read("AUTH_SESSION_DAYS") ?? 30),
  },

  binance: {
    apiKey: read("BINANCE_API_KEY"),
    apiSecret: read("BINANCE_API_SECRET"),
    baseUrl: read("BINANCE_API_BASE") ?? "https://api.binance.com",
  },

  pluggy: {
    clientId: read("PLUGGY_CLIENT_ID"),
    clientSecret: read("PLUGGY_CLIENT_SECRET"),
    santanderItemId: read("PLUGGY_SANTANDER_ITEM_ID"),
    xpItemId: read("PLUGGY_XP_ITEM_ID"),
    baseUrl: read("PLUGGY_API_BASE") ?? "https://api.pluggy.ai",
  },

  brapi: {
    token: read("BRAPI_TOKEN"),
  },
};

export const configured = {
  binance: () => Boolean(env.binance.apiKey && env.binance.apiSecret),
  pluggy: () => Boolean(env.pluggy.clientId && env.pluggy.clientSecret),
  santander: () => configured.pluggy() && Boolean(env.pluggy.santanderItemId),
  xp: () => configured.pluggy() && Boolean(env.pluggy.xpItemId),
};

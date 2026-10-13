import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // O indicador do modo dev ficaria por cima dos botões da barra lateral/inferior.
  devIndicators: false,

  /**
   * Perfis de cache das APIs externas (segundos):
   *  - stale: quanto tempo o navegador reaproveita sem perguntar ao servidor;
   *  - revalidate: depois disso, serve o cache e atualiza em segundo plano;
   *  - expire: depois disso sem acessos, a próxima visita espera dado novo.
   */
  cacheLife: {
    prices: { stale: 60, revalidate: 60, expire: 15 * 60 }, // cotações cripto
    balances: { stale: 60, revalidate: 5 * 60, expire: 60 * 60 }, // saldos Binance
    bank: { stale: 5 * 60, revalidate: 15 * 60, expire: 24 * 60 * 60 }, // Open Finance (atualiza ~1x/dia)
    quotes: { stale: 5 * 60, revalidate: 30 * 60, expire: 24 * 60 * 60 }, // brapi (30 min no plano grátis)
    market: { stale: 60, revalidate: 5 * 60, expire: 60 * 60 }, // câmbio e candles de cripto
    reference: { stale: 60 * 60, revalidate: 12 * 60 * 60, expire: 7 * 24 * 60 * 60 }, // categorias, Selic
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

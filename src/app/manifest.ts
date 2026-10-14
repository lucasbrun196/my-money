import type { MetadataRoute } from "next";

/** Permite "Adicionar à tela inicial" no celular e abrir como app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MyMoney",
    short_name: "MyMoney",
    description: "Painel pessoal de finanças",
    start_url: "/",
    display: "standalone",
    background_color: "#0c0c0b",
    theme_color: "#0c0c0b",
    lang: "pt-BR",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}

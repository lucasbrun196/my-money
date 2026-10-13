import type { MetadataRoute } from "next";

/** Site pessoal: nenhum buscador deve indexar. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}

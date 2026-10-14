import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { PRIVACY_BOOT_SCRIPT } from "@/lib/privacy";
import "./globals.css";

const plexSans = IBM_Plex_Sans({ variable: "--font-plex-sans", subsets: ["latin"], weight: ["400", "500", "600"] });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: { default: "MyMoney", template: "%s · MyMoney" },
  description: "Painel pessoal de finanças: gastos, fatura, salário e investimentos.",
  applicationName: "MyMoney",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "MyMoney", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0c0c0b",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${plexSans.variable} ${plexMono.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PRIVACY_BOOT_SCRIPT }} />
      </head>
      {/* Extensões (ex.: ColorZilla) injetam atributos no <body> antes do React; isso não é erro do app. */}
      <body className="min-h-full" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PRIVACY_BOOT_SCRIPT } from "@/lib/privacy";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "MyMoney", template: "%s · MyMoney" },
  description: "Painel pessoal de finanças: gastos, fatura, salário e investimentos.",
  applicationName: "MyMoney",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "MyMoney", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0a0c11",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full`} suppressHydrationWarning>
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

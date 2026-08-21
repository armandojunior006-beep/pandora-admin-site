import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import "./tailwind.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jbmono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jbmono", display: "swap" });
// Fonte de VERDADE do app Electron (ver tailwind.config.js do bot: fontFamily.sans
// = ["Space Grotesk", ...]) — usada só dentro do demo interativo pra ficar
// pixel-fiel, sem trocar a fonte do resto do site de marketing.
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk", display: "swap" });

export const metadata = {
  metadataBase: new URL("https://pandora-admin-site.vercel.app"),
  title: "Pandora BOT — Painel",
  description: "Gestão de usuários, planos e licenças do Pandora BOT",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${jbmono.variable} ${spaceGrotesk.variable}`}>
      <body>{children}</body>
    </html>
  );
}

import "./globals.css";

export const metadata = {
  title: "Pandora BOT — Painel",
  description: "Gestão de usuários, planos e licenças do Pandora BOT",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

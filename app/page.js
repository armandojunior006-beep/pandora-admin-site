import { sql, ensureSchema } from "../lib/db.js";
import { Navbar } from "./landing/Navbar";
import { LogosSection } from "./landing/LogosSection";
import { FeaturesGrid } from "./landing/FeaturesGrid";
import { ScrollShowcase } from "./landing/ScrollShowcase";
import { HowItWorks } from "./landing/HowItWorks";
import { Testimonials } from "./landing/Testimonials";
import { Pricing } from "./landing/Pricing";
import { Footer } from "./landing/Footer";

const TITLE = "Pandora Bot — Automação de contas e Auto Slot com Pix instantâneo";
const DESCRIPTION =
  "Cadastro automático de contas, Auto Slot para PG/WG/PP, depósito Pix com captura de QR Code e Operação Oculta (modo invisível). Compre seu token e comece agora.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  // Sem isso, o WhatsApp/Telegram/Discord tentavam gerar uma prévia sozinhos
  // e mostravam um fragmento quebrado (bug real 2026-08-09) — agora usam a
  // imagem de app/opengraph-image.js automaticamente + esses metadados.
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    siteName: "Pandora Bot",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export const revalidate = 60;

async function getPlans() {
  try {
    await ensureSchema();
    const rows = await sql`
      SELECT key, name, price_cents, duration_days
      FROM plans
      WHERE active = true AND key IS NOT NULL
      ORDER BY price_cents ASC
    `;
    return rows.map((p) => ({ key: p.key, label: p.name, price_cents: p.price_cents, duration_days: p.duration_days }));
  } catch {
    return [];
  }
}

export default async function LandingPage() {
  const plans = await getPlans();

  return (
    <div id="top" className="min-h-screen overflow-x-clip bg-abyss font-sans text-white antialiased">
      <Navbar />
      <LogosSection />
      <ScrollShowcase />
      <HowItWorks />
      <Testimonials />
      <Pricing plans={plans} />
      <FeaturesGrid />
      <Footer />
    </div>
  );
}

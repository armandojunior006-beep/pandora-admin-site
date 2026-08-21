"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { SectionHead } from "./FeaturesGrid";
import { PurchaseModal } from "./PurchaseModal";

function money(cents) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function periodLabel(days) {
  if (!days) return "pagamento único";
  if (days === 1) return "24 horas";
  if (days === 7) return "por semana";
  if (days === 30) return "por mês";
  return `${days} dias`;
}
const PERKS = ["Todas as funções liberadas", "Auto Slot em todos os jogos", "Operação Oculta incluída", "Atualizações automáticas"];

export function Pricing({ plans }) {
  const [selected, setSelected] = useState(null);
  const featuredKey = plans.find((p) => p.duration_days === 30)?.key;

  return (
    <section id="precos" className="relative border-t border-white/10 py-28 sm:py-36">
      <div className="mx-auto max-w-[1400px] px-6 sm:px-10">
        <SectionHead kicker="preços" title="Escolha seu plano" subtitle="Pagamento via Pix, liberação automática. 1 token = 1 dispositivo." />

        {plans.length === 0 ? (
          <p className="text-white/40">Planos indisponíveis no momento — tente novamente em instantes.</p>
        ) : (
          <div className="grid grid-cols-1 divide-y divide-white/10 border-y border-white/10 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            {plans.map((p, i) => {
              const featured = p.key === featuredKey;
              return (
                <motion.div
                  key={p.key}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className={`relative flex flex-col p-6 py-8 ${featured ? "bg-emerald/[0.04]" : ""}`}
                >
                  {featured && <div className="absolute inset-x-0 top-0 h-px bg-emerald" />}
                  {featured && <div className="mb-3 font-mono text-[10px] font-bold tracking-widest text-emerald">MAIS ESCOLHIDO</div>}
                  <div className="mb-1 font-mono text-[11px] tracking-wide text-white/40">{p.label}</div>
                  <div className="mb-1 text-3xl font-extrabold tracking-tight text-white">{money(p.price_cents)}</div>
                  <div className="mb-7 font-mono text-[11px] text-white/30">{periodLabel(p.duration_days)}</div>
                  <ul className="mb-8 flex-1 space-y-2.5">
                    {PERKS.map((perk) => (
                      <li key={perk} className="text-[12px] leading-snug text-white/50">
                        {perk}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => setSelected(p)}
                    style={featured ? { color: "#030404" } : undefined}
                    className={`py-3 font-mono text-[12px] font-bold transition ${
                      featured ? "bg-emerald hover:brightness-110" : "border border-white/15 text-white hover:border-emerald hover:text-emerald"
                    }`}
                  >
                    comprar →
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {selected && <PurchaseModal plan={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}

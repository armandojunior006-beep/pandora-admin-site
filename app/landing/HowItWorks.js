"use client";
import { motion } from "framer-motion";
import { SectionHead } from "./FeaturesGrid";

const STEPS = [
  { n: "01", title: "Escolha um plano", text: "Teste 24h, semanal, mensal ou vitalício." },
  { n: "02", title: "Pague com Pix", text: "QR Code instantâneo, token liberado na hora." },
  { n: "03", title: "Baixe e instale", text: "Assistente simples, menos de 2 minutos." },
  { n: "04", title: "Cole o token e opere", text: "Clique em \"Token\" na tela de login e comece." },
];

export function HowItWorks() {
  return (
    <section className="relative border-t border-white/10 py-28 sm:py-36">
      <div className="mx-auto max-w-[1400px] px-6 sm:px-10">
        <SectionHead kicker="do zero ao operando" title="Como funciona" subtitle="4 passos, sem burocracia." />
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-4">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <div className="mb-4 font-mono text-[13px] text-emerald">{s.n}</div>
              <h4 className="mb-2 text-[15px] font-bold text-white">{s.title}</h4>
              <p className="text-[12.5px] leading-relaxed text-white/40">{s.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

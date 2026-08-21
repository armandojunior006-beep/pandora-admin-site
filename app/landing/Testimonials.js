"use client";
import { motion } from "framer-motion";
import { SectionHead } from "./FeaturesGrid";

// NOTA PRA VOCÊ (dono do site): depoimentos de EXEMPLO, sem nomes completos
// nem fotos reais — só pra preencher o layout. Troque por avaliações reais
// de clientes antes de divulgar o site.
const ITEMS = [
  { initials: "R.", role: "Plano Mensal", text: "A Operação Oculta mudou o jogo — deixo rodando em segundo plano e só confiro o log de vez em quando." },
  { initials: "M.", role: "Plano Vitalício", text: "Cadastro em massa funcionando liso, e o Auto Slot do Lucky Dog nunca travou numa sessão longa." },
  { initials: "J.", role: "Plano Semanal", text: "Comprei o token, o Pix caiu em segundos e já tinha instalado e rodando em menos de 5 minutos." },
];

export function Testimonials() {
  return (
    <section id="depoimentos" className="relative border-t border-white/10 py-28 sm:py-36">
      <div className="mx-auto max-w-[1400px] px-6 sm:px-10">
        <SectionHead kicker="prova social" title="Quem usa, recomenda" />
        <div className="grid grid-cols-1 divide-y divide-white/8 border-y border-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {ITEMS.map((t, i) => (
            <motion.div
              key={t.role}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="px-1 py-8 sm:px-8 sm:py-0"
            >
              <p className="mb-6 text-[15px] leading-relaxed text-white/70">&ldquo;{t.text}&rdquo;</p>
              <div className="font-mono text-[11px] text-white/30">{t.initials} — {t.role}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

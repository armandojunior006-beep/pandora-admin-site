"use client";
import { motion } from "framer-motion";

const ENGINES = ["PG", "PP", "WG", "TADA", "MG"];

export function LogosSection() {
  return (
    // pt-32 (não border-t/py-10 como antes) — essa seção virou a PRIMEIRA da
    // página depois que o Hero saiu (pedido do usuário 2026-08-09), e o
    // Navbar é "fixed" (sai do fluxo normal) — sem esse respiro no topo ele
    // sobrepõe o conteúdo. Mesmo motivo do Hero antes: era o pt-32 dele que
    // dava esse espaço, ninguém mais dava.
    <section className="relative pb-10 pt-32">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-10 gap-y-4 px-6 sm:px-10">
        <span className="font-mono text-[10.5px] text-white/25">compatível com</span>
        {ENGINES.map((name, i) => (
          <motion.span
            key={name}
            initial={{ opacity: 0 }}
            // eager (animate, não whileInView) — mesmo bug real 2026-08-09 já
            // corrigido no Hero (RevealText.js): conteúdo que já nasce
            // visível no topo da página pode nunca disparar o
            // IntersectionObserver do whileInView, ficando invisível pra
            // sempre. Essa seção virou "acima da dobra" agora que é a 1ª.
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.04 }}
            className="font-mono text-[11px] tracking-wide text-white/20 transition hover:text-emerald"
          >
            {name}
          </motion.span>
        ))}
      </div>
    </section>
  );
}

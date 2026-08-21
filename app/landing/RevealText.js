"use client";
import { motion } from "framer-motion";

// Revelação palavra-por-palavra (estilo editorial/cinematográfico) — usada
// nos títulos grandes em vez de um simples fade-in de bloco inteiro.
//
// BUG real 2026-08-09 (reportado pelo usuário: "todo o começo do site ao
// abrir não tem conteúdo" — h1 inteiro do Hero + botões somem): whileInView
// com viewport={{margin:"-10%"}} depende do IntersectionObserver disparar
// pra revelar o conteúdo — pra elementos que já nascem visíveis (acima da
// dobra, sem precisar rolar nada, como o Hero inteiro), esse disparo pode
// não acontecer de forma confiável dependendo do timing de layout/hydration,
// deixando o conteúdo PERMANENTEMENTE no estado "initial" (invisível/
// deslocado) — parece "site sem conteúdo". `eager=true` troca pra `animate`
// direto (roda no mount, sem depender de nenhum observer) — usado no Hero,
// que é sempre visível no load. O resto da página (seções abaixo da dobra)
// continua usando whileInView normal, onde faz sentido de verdade.
export function RevealWords({ text, className = "", delay = 0, once = true, eager = false }) {
  const words = text.split(" ");
  const animProps = eager
    ? { animate: { y: "0%" } }
    : { whileInView: { y: "0%" }, viewport: { once, margin: "-10%" } };
  // BUG real 2026-08-09 (reportado pelo usuário: "Contasoperadas"/"semtocar"
  // — espaço entre palavras sumindo): o espaço ficava DENTRO do
  // motion.span/inline-block (depois da palavra) — um espaço no fim de uma
  // caixa inline-block é colapsado pelo navegador (mesma regra de
  // whitespace no fim de uma linha), então as palavras coladas. Corrigido
  // colocando o espaço como um caractere IRMÃO, fora da caixa inline-block
  // (não precisa animar, só ocupar largura normal entre as palavras).
  return (
    <span className={className}>
      {words.map((w, i) => (
        <span key={i}>
          <span className="inline-block overflow-hidden align-bottom">
            <motion.span
              className="inline-block"
              initial={{ y: "110%" }}
              {...animProps}
              transition={{ duration: 0.7, delay: delay + i * 0.045, ease: [0.16, 1, 0.3, 1] }}
            >
              {w}
            </motion.span>
          </span>
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}

export function RevealLine({ children, className = "", delay = 0, y = 24, once = true, eager = false }) {
  const animProps = eager
    ? { animate: { opacity: 1, y: 0 } }
    : { whileInView: { opacity: 1, y: 0 }, viewport: { once, margin: "-10%" } };
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      {...animProps}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

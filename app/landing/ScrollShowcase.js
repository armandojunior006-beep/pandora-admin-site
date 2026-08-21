"use client";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { EyeOff, QrCode, Check } from "lucide-react";

const C = { success: "#2ea24c", warning: "#a37b1f", muted: "#4a5a4f" };
const mono = { fontFamily: "var(--font-jbmono), monospace" };

const ROWS = [
  {
    icon: EyeOff,
    kicker: "01 — recurso exclusivo",
    title: "Operação Oculta",
    text: "Ative o modo headless e o Pandora Bot cria contas, faz login e deposita sem abrir NENHUMA janela do Chrome — tudo em segundo plano, enquanto você usa o computador normalmente ou roda num servidor sem monitor.",
    bullets: ["Cria e opera contas sem exibir nenhuma janela do navegador", "QR Code do Pix aparece direto no painel, mesmo sem ver a tela do site", "Liga/desliga com um clique, sem perder nenhuma configuração"],
    preview: (
      <div className="flex h-full flex-col justify-center gap-3 p-6">
        <div className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5" style={{ borderColor: C.warning, background: "#a37b1f1a" }}>
          <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-md" style={{ background: C.warning }}>
            <EyeOff size={14} className="text-black" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-bold leading-tight text-white">Operação Oculta</div>
            <div className="truncate text-[9px] leading-tight" style={{ color: C.muted }}>Cadastra sem abrir janela na tela</div>
          </div>
          <span className="grid h-3.5 w-3.5 flex-shrink-0 place-items-center rounded-sm" style={{ background: C.warning }}>
            <Check size={9} className="text-black" />
          </span>
        </div>
        <p className="text-center text-[15px] font-extrabold tracking-wide" style={{ color: C.warning }}>ATIVADO</p>
        <div className="mt-1 space-y-1.5" style={mono}>
          {["Tela 1 — Login concluído", "Tela 2 — Login concluído", "Tela 3 — cadastrando conta..."].map((t, i) => (
            <p key={t} className="text-[10px]" style={{ color: i === 2 ? C.warning : C.success }}>{t}</p>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: QrCode,
    kicker: "02 — pagamento",
    title: "QR Code capturado sozinho",
    text: "Assim que o depósito é gerado, o bot captura o QR Code do Pix e mostra no painel — inclusive em Operação Oculta. Quando o pagamento cai, a tela já marca como pago sozinha.",
    bullets: ["Sorteio de valor dentro da faixa configurada", "Status de pagamento fica salvo entre navegações", "Funciona igual com ou sem janela visível"],
    preview: (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
        <div className="grid grid-cols-5 gap-0.5 rounded-md bg-white p-2.5">
          {Array.from({ length: 25 }).map((_, i) => (
            <span key={i} className="h-2 w-2" style={{ background: [3, 4, 7, 8, 11, 14, 16, 17, 21, 22].includes(i) ? "#000" : "transparent" }} />
          ))}
        </div>
        <p className="text-[10px]" style={{ color: C.muted }}>QR Pix capturado — R$ 12,00</p>
        <span className="flex items-center gap-1.5 rounded-md px-3 py-1 text-[10.5px] font-bold text-black" style={{ background: C.success }}>
          <Check size={11} /> pago
        </span>
      </div>
    ),
  },
];

export function ScrollShowcase() {
  return (
    <section id="oculta" className="relative border-t border-white/10 py-28 sm:py-36">
      <div className="mx-auto max-w-[1400px] px-6 sm:px-10">
        <div className="flex flex-col gap-32 sm:gap-48">
          {ROWS.map((row, i) => (
            <ShowcaseRow key={row.title} row={row} reverse={i % 2 === 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ShowcaseRow({ row, reverse }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 90%", "end 25%"] });
  const scale = useTransform(scrollYProgress, [0, 0.6], [0.82, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.4], [0, 1]);
  const bgOpacity = useTransform(scrollYProgress, [0, 0.5], [0, 0.05]);

  return (
    <div ref={ref} className="relative grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
      {/* número gigante de fundo, típico de layout editorial/assimétrico */}
      <motion.span
        style={{ opacity: bgOpacity }}
        className={`pointer-events-none absolute -top-16 select-none font-mono text-[220px] font-black leading-none text-white ${reverse ? "right-0" : "left-0"}`}
      >
        {row.kicker.slice(0, 2)}
      </motion.span>

      <div className={reverse ? "lg:order-2" : ""}>
        <div className="mb-5 font-mono text-[11px] tracking-widest text-emerald">{row.kicker}</div>
        <h3 className="mb-5 text-4xl font-extrabold leading-[0.98] tracking-tight text-white sm:text-5xl">{row.title}</h3>
        <p className="mb-7 max-w-md text-[14.5px] leading-relaxed text-white/45">{row.text}</p>
        <ul className="space-y-3 border-l border-white/10 pl-5">
          {row.bullets.map((b) => (
            <li key={b} className="text-[13px] leading-relaxed text-white/65">
              {b}
            </li>
          ))}
        </ul>
      </div>

      <motion.div style={{ scale, opacity }} className={reverse ? "lg:order-1" : ""}>
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-white/10 bg-black">
          {row.preview}
          <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-1.5 font-mono text-[9px] text-white/25">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald" /> pandorabot.exe
          </div>
        </div>
      </motion.div>
    </div>
  );
}

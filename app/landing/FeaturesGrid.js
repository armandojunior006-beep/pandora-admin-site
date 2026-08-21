"use client";
import { motion } from "framer-motion";
import { Target, Bot, CreditCard, Globe2, Layers, ShieldCheck, BarChart3, RefreshCw, KeyRound } from "lucide-react";
import { RevealWords } from "./RevealText";

const FEATURES = [
  { icon: Target, n: "01", title: "Auto Slot multi-jogo", text: "Giro automático configurável por jogo — PG Soft, Lucky Dog, Plushie Wins, Fortune Ox, Santa, Halloween, Emperor." },
  { icon: Bot, n: "02", title: "Cadastro automático em massa", text: "Preenche o formulário, resolve captcha (GeeTest) e humaniza os cliques — dezenas de janelas em paralelo." },
  { icon: CreditCard, n: "03", title: "Depósito Pix automático", text: "Sorteia um valor dentro da faixa configurada, gera o Pix e captura o QR Code direto no painel." },
  { icon: Globe2, n: "04", title: "Proxy por janela + IP único", text: "Cada janela sai por um IP diferente, com rotação automática — evita bloqueio por excesso de cadastros." },
  { icon: Layers, n: "05", title: "Multi Bot — perfis isolados", text: "Várias operações independentes na mesma máquina, cada uma com suas contas, proxies e configurações." },
  { icon: ShieldCheck, n: "06", title: "Anti-detecção nativa", text: "Navegação sem marcas de automação, fingerprint tratado e Chrome real por baixo." },
  { icon: BarChart3, n: "07", title: "Painel de controle completo", text: "Log de operações em tempo real, saldo por conta, saque automático protegido por senha de segurança." },
  { icon: RefreshCw, n: "08", title: "Atualização automática", text: "O bot se atualiza sozinho quando sai uma versão nova, sem reinstalar." },
  { icon: KeyRound, n: "09", title: "1 token = 1 dispositivo", text: "Token vinculado ao seu computador (HWID). Sem mensalidade escondida." },
];

export function FeaturesGrid() {
  return (
    <section id="recursos" className="relative border-t border-white/10 py-28 sm:py-36">
      <div className="mx-auto max-w-[1400px] px-6 sm:px-10">
        <div className="mb-20 flex items-end justify-between gap-6">
          <h2 className="max-w-lg text-4xl font-extrabold leading-[0.95] tracking-tight text-white sm:text-6xl">
            <RevealWords text="Um bot só," />
            <br />
            <span className="text-white/25">
              <RevealWords text="tudo automatizado" delay={0.1} />
            </span>
          </h2>
          <span className="hidden font-mono text-[11px] text-white/25 sm:block">09 recursos</span>
        </div>

        <div className="divide-y divide-white/8 border-y border-white/10">
          {FEATURES.map((f, i) => (
            <FeatureRow key={f.title} f={f} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureRow({ f, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, delay: (index % 3) * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="group grid grid-cols-[auto_1fr] items-center gap-5 py-6 transition sm:grid-cols-[64px_auto_1fr_28px] sm:gap-8 sm:py-8"
    >
      <span className="font-mono text-[12px] text-white/25">{f.n}</span>
      <div className="hidden h-9 w-9 flex-shrink-0 items-center justify-center border border-white/10 text-white/40 transition group-hover:border-emerald group-hover:text-emerald sm:flex">
        <f.icon size={16} />
      </div>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-6">
        <h3 className="w-full flex-shrink-0 text-[17px] font-bold text-white sm:w-72">{f.title}</h3>
        <p className="max-w-md text-[13px] leading-relaxed text-white/40">{f.text}</p>
      </div>
      <span className="hidden text-white/15 transition group-hover:translate-x-1 group-hover:text-emerald sm:block">→</span>
    </motion.div>
  );
}

export function SectionHead({ kicker, title, subtitle, center = false }) {
  return (
    <div className={`mb-16 max-w-2xl ${center ? "mx-auto text-center" : ""}`}>
      <div className="mb-3 font-mono text-[11px] tracking-widest text-emerald">// {kicker}</div>
      <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">{title}</h2>
      {subtitle && <p className="mt-4 text-[14.5px] leading-relaxed text-white/40">{subtitle}</p>}
    </div>
  );
}

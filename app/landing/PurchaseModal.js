"use client";
// ============================================================================
// Fluxo de compra — mesma lógica de antes (login/criar conta → gera Pix via
// MisticPay → polling do status → token + download), só que restilizado em
// Tailwind + framer-motion pra bater com o resto da landing nova.
// ============================================================================
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, Loader2, CheckCircle2, Download } from "lucide-react";
import { DOWNLOAD_URL } from "./constants";

const POLL_MS = 3500;

export function PurchaseModal({ plan, onClose }) {
  const [mode, setMode] = useState("new");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [payment, setPayment] = useState(null);
  const [status, setStatus] = useState("idle");
  const [token, setToken] = useState(null);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  function startPolling(paymentId) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/public/payments/${paymentId}/status`);
        const data = await r.json();
        if (!data.ok) return;
        if (data.status === "paid") { setStatus("paid"); setToken(data.token || null); clearInterval(pollRef.current); }
        else if (data.status === "failed") { setStatus("failed"); clearInterval(pollRef.current); }
      } catch {}
    }, POLL_MS);
  }

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    const l = login.trim().toLowerCase();
    if (mode === "new" && l.length < 3) return setErr("Login precisa ter pelo menos 3 caracteres.");
    if (password.length < 4) return setErr("Senha muito curta (mínimo 4 caracteres).");
    setBusy(true);
    try {
      const body = mode === "login" ? { plan_key: plan.key, login: l, password } : { plan_key: plan.key, new_login: l, new_password: password };
      const r = await fetch("/api/public/payments/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await r.json();
      if (!data.ok) throw new Error(data.error || "Falha ao gerar cobrança");
      setPayment(data);
      setStatus("pending");
      startPolling(data.payment_id);
    } catch (e2) {
      setErr(e2.message || String(e2));
    } finally {
      setBusy(false);
    }
  }

  function copyPix() {
    if (!payment?.qr_code_text) return;
    navigator.clipboard?.writeText(payment.qr_code_text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); });
  }

  const priceLabel = (plan.price_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-panel-2 p-7 shadow-[0_40px_120px_-30px_rgba(0,214,143,0.5)]"
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-white/40 transition hover:text-white" aria-label="Fechar">
          <X size={18} />
        </button>

        <AnimatePresence mode="wait">
          {status === "idle" && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h3 className="text-lg font-extrabold text-white">Comprar {plan.label}</h3>
              <p className="mb-5 text-[12px] text-white/45">Pagamento instantâneo via Pix. Token liberado assim que confirmar.</p>
              <div className="mb-5 flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-[13px]">
                <span className="text-white/60">{plan.label}</span>
                <strong className="text-emerald">{priceLabel}</strong>
              </div>
              <div className="mb-4 flex gap-1 rounded-xl bg-black/30 p-1">
                <button type="button" onClick={() => setMode("new")} style={mode === "new" ? { color: "#030404" } : undefined} className={`flex-1 rounded-lg py-2 text-[12px] font-bold transition ${mode === "new" ? "bg-emerald" : "text-white/45"}`}>Criar conta</button>
                <button type="button" onClick={() => setMode("login")} style={mode === "login" ? { color: "#030404" } : undefined} className={`flex-1 rounded-lg py-2 text-[12px] font-bold transition ${mode === "login" ? "bg-emerald" : "text-white/45"}`}>Já tenho conta</button>
              </div>
              <form onSubmit={submit} className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-white/40">Login</label>
                  <input autoFocus value={login} onChange={(e) => setLogin(e.target.value)} className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-[13.5px] text-white outline-none focus:border-emerald/60" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-wide text-white/40">Senha</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-[13.5px] text-white outline-none focus:border-emerald/60" />
                </div>
                {err && <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12px] text-red-400">{err}</div>}
                <button disabled={busy} style={{ color: "#030404" }} className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald py-3 text-[13px] font-bold disabled:opacity-50">
                  {busy && <Loader2 size={14} className="animate-spin" />}
                  {busy ? "Gerando Pix..." : "Gerar QR Code Pix"}
                </button>
              </form>
            </motion.div>
          )}

          {status === "pending" && payment && (
            <motion.div key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
              <h3 className="text-lg font-extrabold text-white">Escaneie e pague</h3>
              <p className="mb-5 text-[12px] text-white/45">{plan.label} — {priceLabel}</p>
              {payment.qr_code_image && (
                <img
                  className="mx-auto mb-4 h-[210px] w-[210px] rounded-xl bg-white p-2.5"
                  src={payment.qr_code_image.startsWith("data:") ? payment.qr_code_image : `data:image/png;base64,${payment.qr_code_image}`}
                  alt="QR Code Pix"
                />
              )}
              {payment.qr_code_text && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 p-2">
                  <input readOnly value={payment.qr_code_text} onFocus={(e) => e.target.select()} className="flex-1 truncate bg-transparent px-1 font-mono text-[10.5px] text-white/50 outline-none" />
                  <button onClick={copyPix} type="button" className="flex items-center gap-1 whitespace-nowrap rounded-md bg-emerald-dim px-2.5 py-1.5 text-[11px] font-bold text-emerald">
                    {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copiado" : "Copiar"}
                  </button>
                </div>
              )}
              <div className="flex items-center justify-center gap-2 text-[12px] text-white/40">
                <Loader2 size={13} className="animate-spin text-emerald" />
                Aguardando confirmação do pagamento...
              </div>
            </motion.div>
          )}

          {status === "failed" && (
            <motion.div key="failed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-[13px] text-red-400">
              Não foi possível confirmar o pagamento. Tente gerar um novo Pix ou fale com o suporte.
            </motion.div>
          )}

          {status === "paid" && (
            <motion.div key="paid" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-emerald/15 text-emerald">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="text-lg font-extrabold text-white">Pagamento confirmado!</h3>
              <p className="mb-4 text-[12px] text-white/45">Copie seu token, baixe o Pandora Bot e cole na tela de login (opção &quot;Token&quot;).</p>
              {token && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-dashed border-emerald/50 bg-black/30 p-3">
                  <code className="flex-1 truncate text-left font-mono text-[12px] text-emerald">{token}</code>
                  <button
                    onClick={() => { navigator.clipboard?.writeText(token); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
                    className="flex-shrink-0 rounded-md bg-emerald-dim px-2.5 py-1.5 text-[11px] font-bold text-emerald"
                  >
                    {copied ? "Copiado!" : "Copiar"}
                  </button>
                </div>
              )}
              <a href={DOWNLOAD_URL} style={{ color: "#030404" }} className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald py-3 text-[13px] font-bold">
                <Download size={15} /> Baixar Pandora Bot
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ============================================================================
// Cliente da API SyncPay (gateway Pix) — substitui a MisticPay (2026-08-22).
// Docs: https://syncpay.apidog.io — API "partner v1".
// Auth: POST /auth-token com client_id/client_secret → Bearer (válido 1h,
// cacheado em módulo). Valores em REAIS (confirmado ao vivo em 2026-08-22).
// A SyncPay não devolve imagem de QR (só o copia-e-cola), então geramos o
// PNG base64 aqui com o pacote `qrcode`.
// Exporta a MESMA interface do antigo lib/misticpay.js (createPixCharge/
// checkPixCharge com transactionId/copyPaste/qrCodeBase64 e
// transactionState COMPLETO/PENDENTE/FALHA) pra as rotas não mudarem.
// ============================================================================
import QRCode from "qrcode";

const BASE_URL = "https://api.syncpayments.com.br/api/partner/v1";

let cachedToken = null;
let cachedTokenExpiresAt = 0;

async function getToken() {
  if (cachedToken && Date.now() < cachedTokenExpiresAt) return cachedToken;
  const client_id = process.env.SYNCPAY_CLIENT_ID;
  const client_secret = process.env.SYNCPAY_CLIENT_SECRET;
  if (!client_id || !client_secret) throw new Error("SYNCPAY_CLIENT_ID/SYNCPAY_CLIENT_SECRET não configurados");
  const res = await fetch(`${BASE_URL}/auth-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id, client_secret }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(data?.message || `SyncPay auth HTTP ${res.status}`);
  }
  cachedToken = data.access_token;
  // expires_in em segundos (3600); renova 5 min antes por folga.
  cachedTokenExpiresAt = Date.now() + (Number(data.expires_in) || 3600) * 1000 - 5 * 60 * 1000;
  return cachedToken;
}

async function syncFetch(path, { method = "GET", body } = {}) {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(data?.message || data?.error || `SyncPay HTTP ${res.status}`);
  return data;
}

// Mapeia status SyncPay → vocabulário que o webhook já entende (era MisticPay).
function toTransactionState(status) {
  const s = String(status || "").toLowerCase();
  if (s === "completed") return "COMPLETO";
  if (s === "failed" || s === "refunded" || s === "med") return "FALHA";
  return "PENDENTE"; // pending e qualquer coisa desconhecida
}

// amountReais: valor em reais (ex: 19.9). transactionId nosso é ignorado —
// a SyncPay gera o identifier dela e é ele que volta em transactionId.
async function createPixCharge({ amountReais, payerName, payerDocument, description }) {
  const data = await syncFetch("/cash-in", {
    method: "POST",
    body: {
      amount: amountReais,
      description: description || "Assinatura Pandora BOT",
      client: {
        name: payerName || "Cliente Pandora",
        email: "cliente@pandorabot.shop",
        cpf: String(payerDocument || "").replace(/\D/g, "") || "00000000000",
        phone: "11999999999",
      },
    },
  });
  if (!data.identifier || !data.pix_code) {
    throw new Error("SyncPay não retornou identifier/pix_code: " + JSON.stringify(data).slice(0, 200));
  }
  const qrCodeBase64 = await QRCode.toDataURL(data.pix_code, { margin: 1, width: 420 });
  return { transactionId: data.identifier, copyPaste: data.pix_code, qrCodeBase64 };
}

async function checkPixCharge(transactionId) {
  const data = await syncFetch(`/transaction/${encodeURIComponent(transactionId)}`);
  const t = data?.data || {};
  // value em reais, como o webhook espera (ele multiplica por 100).
  return { transactionState: toTransactionState(t.status), value: t.amount };
}

export { createPixCharge, checkPixCharge };

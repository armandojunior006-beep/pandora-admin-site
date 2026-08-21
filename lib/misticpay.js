// ============================================================================
// Cliente da API MisticPay (gateway Pix). Autenticação por headers "ci"/"cs"
// (client id / client secret) — NÃO é OAuth, é enviado em toda requisição.
// Docs: https://app.misticpay.com/docs
// ============================================================================
const BASE_URL = "https://api.misticpay.com/api";

function getCreds() {
  const ci = process.env.MISTICPAY_CLIENT_ID;
  const cs = process.env.MISTICPAY_CLIENT_SECRET;
  if (!ci || !cs) throw new Error("MISTICPAY_CLIENT_ID/MISTICPAY_CLIENT_SECRET não configurados");
  return { ci, cs };
}

async function misticFetch(path, body) {
  const { ci, cs } = getCreds();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ci, cs },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    throw new Error(data?.message || data?.error || `MisticPay HTTP ${res.status}`);
  }
  return data;
}

// amountReais: valor em reais (ex: 19.9), não em centavos.
async function createPixCharge({ amountReais, payerName, payerDocument, transactionId, description }) {
  const data = await misticFetch("/transactions/create", {
    amount: amountReais,
    payerName: payerName || "Cliente Pandora",
    payerDocument: String(payerDocument || "").replace(/\D/g, "") || "00000000000",
    transactionId,
    description: description || "Assinatura Pandora BOT",
  });
  return data?.data || data;
}

async function checkPixCharge(transactionId) {
  const data = await misticFetch("/transactions/check", { transactionId });
  return data?.transaction || data;
}

export { createPixCharge, checkPixCharge };

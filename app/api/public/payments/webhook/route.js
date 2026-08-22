// ============================================================================
// POST /api/public/payments/webhook — recebido pela SyncPay quando o
// status de uma cobrança Pix (cash-in) muda. Configurar esta URL EXATA no
// painel da SyncPay (webhook "Recebimento - Cash in"):
//   https://pandora-admin-site.vercel.app/api/public/payments/webhook?key=<SYNCPAY_WEBHOOK_SECRET>
//
// Payload (cash-in webhook): { id, end_to_end, client{...}, pix_code,
//   amount, final_amount, currency, status, payment_method, ... }
// "id" = identifier da transação (nosso provider_tx_id);
// status: "pending" | "completed" | "failed" | "refunded" | "med"
//
// SEGURANÇA — a SyncPay não assina os webhooks com HMAC. Sem proteção,
// qualquer pessoa que descobrisse esta URL poderia forjar um POST
// { status: "completed" } e ganhar um token sem pagar. Duas camadas:
//   1) ?key= precisa bater com SYNCPAY_WEBHOOK_SECRET (só nós conhecemos,
//      configurado direto na URL cadastrada no painel da SyncPay).
//   2) Mesmo com a chave certa, NUNCA confiamos no "status" do corpo do
//      POST — sempre re-confirmamos o pagamento direto na API da SyncPay
//      (checkPixCharge, autenticado com client_id/secret que só o servidor
//      tem) antes de liberar o token. Isso torna impossível forjar um
//      pagamento mesmo que a URL secreta vaze.
// ============================================================================
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { sql, ensureSchema } from "../../../../../lib/db.js";
import { checkPixCharge } from "../../../../../lib/syncpay.js";

function genToken() {
  return "pdr_" + crypto.randomBytes(24).toString("hex");
}

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a || ""));
  const bufB = Buffer.from(String(b || ""));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function POST(req) {
  try {
    // Duas credenciais válidas: ?key= (nosso secret na URL) OU o Bearer que a
    // SyncPay envia no header Authorization (token gerado ao criar o webhook
    // no painel deles, em SYNCPAY_WEBHOOK_TOKEN). Qualquer uma autoriza.
    const expectedKey = process.env.SYNCPAY_WEBHOOK_SECRET;
    const expectedBearer = process.env.SYNCPAY_WEBHOOK_TOKEN;
    if (!expectedKey && !expectedBearer) return NextResponse.json({ ok: false, error: "Webhook não configurado (secret ausente)" }, { status: 500 });
    const gotKey = new URL(req.url).searchParams.get("key");
    const gotBearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const keyOk = expectedKey && gotKey && timingSafeEqual(gotKey, expectedKey);
    const bearerOk = expectedBearer && gotBearer && timingSafeEqual(gotBearer, expectedBearer);
    if (!keyOk && !bearerOk) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    await ensureSchema();
    const body = await req.json().catch(() => ({}));
    // SyncPay manda o identifier no campo "id"; aceita transactionId como
    // fallback pra webhooks antigos da MisticPay ainda em trânsito.
    const providerTxId = String(body.id || body.transactionId || "").trim();
    if (!providerTxId) return NextResponse.json({ ok: false, error: "id ausente" }, { status: 400 });

    const rows = await sql`SELECT * FROM payments WHERE provider_tx_id = ${providerTxId}`;
    if (!rows.length) {
      // Não é erro fatal do lado da MisticPay — só não achamos o pedido (ex: teste manual).
      return NextResponse.json({ ok: true, ignored: true });
    }
    const payment = rows[0];
    if (payment.status === "pago") return NextResponse.json({ ok: true, already: true }); // idempotência (webhook pode repetir)

    // Re-confirma direto na MisticPay em vez de confiar no corpo do POST.
    let officialStatus = "";
    let officialValue = null;
    try {
      const check = await checkPixCharge(providerTxId);
      officialStatus = String(check?.transactionState || "").toUpperCase();
      officialValue = check?.value != null ? Math.round(Number(check.value) * 100) : null;
    } catch (e) {
      // Falha ao consultar a MisticPay — não libera nada, tenta de novo no próximo webhook/retry.
      return NextResponse.json({ ok: false, error: "Falha ao confirmar com a MisticPay: " + (e?.message || e) }, { status: 502 });
    }

    if (officialStatus !== "COMPLETO") {
      if (officialStatus === "FALHA" && payment.status === "pendente") {
        await sql`UPDATE payments SET status = 'falhou', updated_at = now() WHERE id = ${payment.id}`;
      }
      return NextResponse.json({ ok: true });
    }
    // Valor pago precisa bater com o valor cobrado (evita reaproveitar um
    // transactionId para liberar plano mais caro que o pago).
    if (officialValue != null && Math.abs(officialValue - payment.amount_cents) > 5) {
      await sql`UPDATE payments SET status = 'falhou', updated_at = now() WHERE id = ${payment.id}`;
      return NextResponse.json({ ok: false, error: "Valor pago não confere com o valor cobrado" }, { status: 400 });
    }

    // Garante o usuário: já existente (user_id) ou cria a partir de new_login/new_password_hash.
    let userId = payment.user_id;
    if (!userId) {
      if (!payment.new_login || !payment.new_password_hash) {
        await sql`UPDATE payments SET status = 'falhou', updated_at = now() WHERE id = ${payment.id}`;
        return NextResponse.json({ ok: false, error: "Pagamento sem usuário associado" }, { status: 500 });
      }
      const existing = await sql`SELECT id FROM users WHERE login = ${payment.new_login}`;
      if (existing.length) {
        userId = existing[0].id; // login foi criado por outro meio nesse meio-tempo — usa o existente
      } else {
        const created = await sql`
          INSERT INTO users (name, login, password_hash, status)
          VALUES (${payment.new_login}, ${payment.new_login}, ${payment.new_password_hash}, 'ativo')
          RETURNING id
        `;
        userId = created[0].id;
      }
    }

    let durationDays = null;
    if (payment.plan_id) {
      const planRows = await sql`SELECT duration_days FROM plans WHERE id = ${payment.plan_id}`;
      durationDays = planRows[0]?.duration_days ?? null;
    }

    const token = genToken();
    if (durationDays) {
      await sql`
        INSERT INTO licenses (user_id, plan_id, token, expires_at)
        VALUES (${userId}, ${payment.plan_id}, ${token}, now() + make_interval(days => ${durationDays}))
      `;
    } else {
      await sql`
        INSERT INTO licenses (user_id, plan_id, token, expires_at)
        VALUES (${userId}, ${payment.plan_id}, ${token}, NULL)
      `;
    }

    await sql`
      UPDATE payments SET status = 'pago', user_id = ${userId}, license_token = ${token}, updated_at = now()
      WHERE id = ${payment.id}
    `;

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

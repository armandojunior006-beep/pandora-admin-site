// ============================================================================
// POST /api/public/payments/create — compra automática de plano via Pix
// (MisticPay). Body: { plan_key, login?, password?, new_login?, new_password? }
// - Se vier login/password: vincula o pagamento a um usuário já existente.
// - Se vier new_login/new_password: cria a conta somente quando o Pix for
//   confirmado (webhook), evitando lixo de contas não pagas no banco.
// ============================================================================
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { sql, ensureSchema } from "../../../../../lib/db.js";
import { hashPassword, comparePassword } from "../../../../../lib/auth.js";
import { createPixCharge } from "../../../../../lib/misticpay.js";
import { withCors, CORS_HEADERS } from "../../../../../lib/cors.js";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req) {
  try {
    await ensureSchema();
    const body = await req.json().catch(() => ({}));
    const planKey = String(body.plan_key || "").trim();
    if (!planKey) return withCors(NextResponse.json({ ok: false, error: "Plano não informado" }, { status: 400 }));

    const planRows = await sql`SELECT id, name, price_cents, duration_days FROM plans WHERE key = ${planKey} AND active = true`;
    if (!planRows.length) return withCors(NextResponse.json({ ok: false, error: "Plano não encontrado ou inativo" }, { status: 404 }));
    const plan = planRows[0];
    if (!plan.price_cents || plan.price_cents <= 0) {
      return withCors(NextResponse.json({ ok: false, error: "Este plano não tem preço configurado para compra automática" }, { status: 400 }));
    }

    let userId = null;
    let newLogin = null;
    let newPasswordHash = null;
    let payerName = "Cliente Pandora";

    const login = String(body.login || "").trim().toLowerCase();
    const password = String(body.password || "");
    const wantsNewAccount = String(body.new_login || "").trim().length > 0;

    if (login && password) {
      const rows = await sql`SELECT id, password_hash FROM users WHERE login = ${login}`;
      if (!rows.length) return withCors(NextResponse.json({ ok: false, error: "Login ou senha incorretos" }, { status: 401 }));
      if (!rows[0].password_hash || !comparePassword(password, rows[0].password_hash)) {
        return withCors(NextResponse.json({ ok: false, error: "Login ou senha incorretos" }, { status: 401 }));
      }
      userId = rows[0].id;
      payerName = login;
    } else if (wantsNewAccount) {
      newLogin = String(body.new_login).trim().toLowerCase();
      const newPassword = String(body.new_password || "");
      if (newLogin.length < 3) return withCors(NextResponse.json({ ok: false, error: "Login inválido" }, { status: 400 }));
      if (newPassword.length < 4) return withCors(NextResponse.json({ ok: false, error: "Senha muito curta" }, { status: 400 }));
      const existing = await sql`SELECT id FROM users WHERE login = ${newLogin}`;
      if (existing.length) return withCors(NextResponse.json({ ok: false, error: "Login já cadastrado" }, { status: 409 }));
      newPasswordHash = hashPassword(newPassword);
      payerName = newLogin;
    } else {
      return withCors(NextResponse.json({ ok: false, error: "Identificação ausente (login ou novo cadastro)" }, { status: 400 }));
    }

    // Cria a linha do pagamento primeiro pra ter um id nosso estável, depois
    // gera a cobrança na MisticPay usando esse id como transactionId (facilita
    // casar o webhook sem depender só do id retornado por eles).
    // Segurança 2026-08-18 (IDOR corrigido): gera junto um token opaco de
    // consulta — devolvido só nesta resposta, exigido depois pra consultar
    // /status (ver route.js de status). Sem isso, o id sequencial sozinho
    // bastava pra qualquer um espiar/roubar o license_token de outro pagamento.
    const pollToken = crypto.randomUUID();
    const inserted = await sql`
      INSERT INTO payments (provider, provider_tx_id, plan_id, user_id, new_login, new_password_hash, amount_cents, status, poll_token)
      VALUES ('misticpay', ${'pending_' + crypto.randomUUID()}, ${plan.id}, ${userId}, ${newLogin}, ${newPasswordHash}, ${plan.price_cents}, 'pendente', ${pollToken})
      RETURNING id
    `;
    const paymentId = inserted[0].id;

    let charge;
    try {
      charge = await createPixCharge({
        amountReais: plan.price_cents / 100,
        payerName,
        payerDocument: "00000000000",
        transactionId: `pdr_${paymentId}`,
        description: `Pandora BOT — ${plan.name}`,
      });
    } catch (e) {
      await sql`UPDATE payments SET status = 'falhou', updated_at = now() WHERE id = ${paymentId}`;
      return withCors(NextResponse.json({ ok: false, error: "Falha ao gerar Pix: " + (e?.message || e) }, { status: 502 }));
    }

    const providerTxId = String(charge.transactionId || `pdr_${paymentId}`);
    await sql`
      UPDATE payments
      SET provider_tx_id = ${providerTxId}, qr_code_text = ${charge.copyPaste || ""}, qr_code_image = ${charge.qrCodeBase64 || ""}, updated_at = now()
      WHERE id = ${paymentId}
    `;

    return withCors(NextResponse.json({
      ok: true,
      payment_id: String(paymentId),
      poll_token: pollToken,
      qr_code_text: charge.copyPaste || "",
      qr_code_image: charge.qrCodeBase64 || "",
    }));
  } catch (e) {
    return withCors(NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 }));
  }
}

// ============================================================================
// POST /api/public/auth/confirm-token — tela "Confirme seu Token" (Login.tsx).
// Body: { login, password, token, device_hash, device_name, user_agent }
// Valida login+senha, confere que o token pertence a esse usuário, vincula
// o dispositivo (1ª ativação) ou confirma que já é o mesmo dispositivo.
// Resposta: { ok:true, login, plan_key, expires_at }
// ============================================================================
import { NextResponse } from "next/server";
import { sql, ensureSchema } from "../../../../../lib/db.js";
import { comparePassword } from "../../../../../lib/auth.js";
import { withCors, CORS_HEADERS } from "../../../../../lib/cors.js";
import { checkRateLimit, getClientIp } from "../../../../../lib/rateLimit.js";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req) {
  try {
    await ensureSchema();
    // Segurança 2026-08-18: rate limit — sem isso dava pra força bruta em
    // login/senha ou token sem limite nenhum.
    const rl = await checkRateLimit(`confirm-token:${getClientIp(req)}`, { max: 10, windowMs: 60_000 });
    if (!rl.allowed) return withCors(NextResponse.json({ ok: false, error: "Muitas tentativas — aguarde um instante" }, { status: 429 }));
    const body = await req.json().catch(() => ({}));
    const login = String(body.login || "").trim().toLowerCase();
    const password = String(body.password || "");
    const token = String(body.token || "").trim();
    const deviceHash = String(body.device_hash || "").trim();

    const userRows = await sql`SELECT id, password_hash, status FROM users WHERE login = ${login}`;
    const user = userRows[0];
    if (!user || !user.password_hash || !comparePassword(password, user.password_hash)) {
      return withCors(NextResponse.json({ ok: false, error: "Login ou senha incorretos" }, { status: 401 }));
    }
    if (user.status !== "ativo") {
      return withCors(NextResponse.json({ ok: false, error: "Usuário bloqueado — fale com o suporte" }, { status: 403 }));
    }

    const licRows = await sql`
      SELECT l.id, l.user_id, l.status, l.expires_at, l.device_hwid, p.key AS plan_key
      FROM licenses l
      LEFT JOIN plans p ON p.id = l.plan_id
      WHERE l.token = ${token}
    `;
    const lic = licRows[0];
    if (!lic) return withCors(NextResponse.json({ ok: false, error: "Token inválido" }, { status: 404 }));
    if (lic.user_id !== user.id) {
      return withCors(NextResponse.json({ ok: false, error: "Este token não pertence a este login" }, { status: 403 }));
    }
    if (lic.status === "suspenso") {
      return withCors(NextResponse.json({ ok: false, error: "Token suspenso — fale com o suporte" }, { status: 403 }));
    }
    const isExpired = lic.expires_at && new Date(lic.expires_at).getTime() <= Date.now();
    if (isExpired || lic.status === "expirado") {
      if (lic.status !== "expirado") await sql`UPDATE licenses SET status = 'expirado' WHERE id = ${lic.id}`;
      return withCors(NextResponse.json({ ok: false, error: "Token expirado" }, { status: 403 }));
    }
    if (!lic.device_hwid && deviceHash) {
      await sql`UPDATE licenses SET device_hwid = ${deviceHash} WHERE id = ${lic.id}`;
    } else if (lic.device_hwid && deviceHash && lic.device_hwid !== deviceHash) {
      return withCors(NextResponse.json({ ok: false, error: "Este token já está em uso em outro dispositivo" }, { status: 403 }));
    }

    return withCors(NextResponse.json({ ok: true, login, plan_key: lic.plan_key || null, expires_at: lic.expires_at }));
  } catch (e) {
    return withCors(NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 }));
  }
}

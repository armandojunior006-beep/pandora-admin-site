// ============================================================================
// POST /api/public/auth/login — usado pela tela de login do app (Login.tsx).
// Body: { login, password } → { ok:true } se as credenciais baterem.
// (O app, ao receber ok:true, sempre pede o token em seguida — ver
// /api/public/auth/confirm-token.)
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
    // Segurança 2026-08-18: rate limit — sem isso dava pra força bruta a
    // senha do usuário sem limite nenhum.
    const rl = await checkRateLimit(`public-login:${getClientIp(req)}`, { max: 10, windowMs: 60_000 });
    if (!rl.allowed) return withCors(NextResponse.json({ ok: false, error: "Muitas tentativas — aguarde um instante" }, { status: 429 }));
    const body = await req.json().catch(() => ({}));
    const login = String(body.login || "").trim().toLowerCase();
    const password = String(body.password || "");

    const rows = await sql`SELECT id, password_hash, status FROM users WHERE login = ${login}`;
    const user = rows[0];
    if (!user || !user.password_hash || !comparePassword(password, user.password_hash)) {
      return withCors(NextResponse.json({ ok: false, error: "Login ou senha incorretos" }, { status: 401 }));
    }
    if (user.status !== "ativo") {
      return withCors(NextResponse.json({ ok: false, error: "Usuário bloqueado — fale com o suporte" }, { status: 403 }));
    }

    return withCors(NextResponse.json({ ok: true, login }));
  } catch (e) {
    return withCors(NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 }));
  }
}

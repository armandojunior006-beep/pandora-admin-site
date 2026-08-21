// ============================================================================
// POST /api/auth/bot-login — chamado pelo BOT (Electron), não pelo painel web.
// Mesmo login/senha que o cliente usa (o dono/admin também é um "user" com
// senha, então o MESMO login/senha do painel funciona aqui se ele também
// tiver sido cadastrado como usuário). Retorna o token da licença ativa mais
// recente desse usuário — o bot usa esse token depois em /api/licenses/validate.
// ============================================================================
import { NextResponse } from "next/server";
import { sql, ensureSchema } from "../../../../lib/db.js";
import { comparePassword } from "../../../../lib/auth.js";
import { checkRateLimit, getClientIp } from "../../../../lib/rateLimit.js";

export async function POST(req) {
  try {
    await ensureSchema();
    // Segurança 2026-08-18: rate limit — sem isso dava pra tentar login por
    // força bruta sem limite nenhum.
    const rl = await checkRateLimit(`bot-login:${getClientIp(req)}`, { max: 10, windowMs: 60_000 });
    if (!rl.allowed) return NextResponse.json({ ok: false, error: "Muitas tentativas — aguarde um instante" }, { status: 429 });
    const body = await req.json().catch(() => ({}));
    const login = String(body.login || "").trim().toLowerCase();
    const password = String(body.password || "");

    const rows = await sql`SELECT id, name, login, password_hash, status FROM users WHERE login = ${login}`;
    const user = rows[0];
    if (!user || !user.password_hash || !comparePassword(password, user.password_hash)) {
      return NextResponse.json({ ok: false, error: "Login ou senha inválidos" }, { status: 401 });
    }
    if (user.status !== "ativo") {
      return NextResponse.json({ ok: false, error: "Usuário bloqueado — fale com o suporte" }, { status: 403 });
    }

    const licRows = await sql`
      SELECT l.token, l.status, l.expires_at, p.name AS plan_name
      FROM licenses l
      LEFT JOIN plans p ON p.id = l.plan_id
      WHERE l.user_id = ${user.id} AND l.status != 'expirado'
      ORDER BY l.id DESC
      LIMIT 1
    `;
    const lic = licRows[0];
    if (!lic) {
      return NextResponse.json({ ok: false, error: "Nenhuma licença ativa para este usuário" }, { status: 403 });
    }

    return NextResponse.json({
      ok: true,
      token: lic.token,
      userName: user.name,
      planName: lic.plan_name || null,
      expiresAt: lic.expires_at,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

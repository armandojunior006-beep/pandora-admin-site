// ============================================================================
// POST /api/public/auth/register — tela "Criar conta" do Login.tsx.
// Body: { login, password, cpf }
// ============================================================================
import { NextResponse } from "next/server";
import { sql, ensureSchema } from "../../../../../lib/db.js";
import { hashPassword } from "../../../../../lib/auth.js";
import { withCors, CORS_HEADERS } from "../../../../../lib/cors.js";
import { checkRateLimit, getClientIp } from "../../../../../lib/rateLimit.js";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req) {
  try {
    await ensureSchema();
    // Segurança 2026-08-18: rate limit — limite mais apertado (5/min) pra
    // dificultar criação de contas em massa por script.
    const rl = await checkRateLimit(`register:${getClientIp(req)}`, { max: 5, windowMs: 60_000 });
    if (!rl.allowed) return withCors(NextResponse.json({ ok: false, error: "Muitas tentativas — aguarde um instante" }, { status: 429 }));
    const body = await req.json().catch(() => ({}));
    const login = String(body.login || "").trim().toLowerCase();
    const password = String(body.password || "");
    const cpf = String(body.cpf || "").replace(/\D/g, "");

    if (!login || login.length < 3) return withCors(NextResponse.json({ ok: false, error: "Login inválido" }, { status: 400 }));
    if (!password || password.length < 4) return withCors(NextResponse.json({ ok: false, error: "Senha muito curta" }, { status: 400 }));
    if (cpf.length !== 11) return withCors(NextResponse.json({ ok: false, error: "CPF inválido" }, { status: 400 }));

    const existing = await sql`SELECT id FROM users WHERE login = ${login}`;
    if (existing.length) return withCors(NextResponse.json({ ok: false, error: "Login já cadastrado" }, { status: 409 }));

    const hash = hashPassword(password);
    await sql`INSERT INTO users (name, login, password_hash, cpf) VALUES (${login}, ${login}, ${hash}, ${cpf})`;

    return withCors(NextResponse.json({ ok: true, login }));
  } catch (e) {
    return withCors(NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 }));
  }
}

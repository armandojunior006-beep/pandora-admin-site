import { NextResponse } from "next/server";
import { sql, ensureSchema } from "../../../lib/db.js";
import { hashPassword } from "../../../lib/auth.js";

export async function GET() {
  await ensureSchema();
  const rows = await sql`SELECT id, name, login, contact, notes, status, created_at,
                                 (password_hash IS NOT NULL) AS has_password
                          FROM users ORDER BY id DESC`;
  return NextResponse.json({ ok: true, users: rows });
}

export async function POST(req) {
  try {
    await ensureSchema();
    const body = await req.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    const login = String(body.login || "").trim();
    const contact = String(body.contact || "").trim();
    const notes = String(body.notes || "").trim();
    const password = String(body.password || "");
    if (!name) return NextResponse.json({ ok: false, error: "Nome é obrigatório" }, { status: 400 });
    if (!login) return NextResponse.json({ ok: false, error: "Login é obrigatório" }, { status: 400 });
    if (password && password.length < 6) {
      return NextResponse.json({ ok: false, error: "Senha precisa ter ao menos 6 caracteres (ou deixe vazio)" }, { status: 400 });
    }
    const passwordHash = password ? hashPassword(password) : null;

    const rows = await sql`
      INSERT INTO users (name, login, contact, notes, password_hash)
      VALUES (${name}, ${login}, ${contact}, ${notes}, ${passwordHash})
      RETURNING id, name, login, contact, notes, status, created_at, (password_hash IS NOT NULL) AS has_password
    `;
    return NextResponse.json({ ok: true, user: rows[0] });
  } catch (e) {
    const msg = /unique/i.test(e?.message || "") ? "Já existe um usuário com esse login" : (e?.message || String(e));
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

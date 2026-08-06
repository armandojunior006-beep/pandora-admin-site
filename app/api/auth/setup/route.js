// ============================================================================
// POST /api/auth/setup — cria o PRIMEIRO admin do painel.
// Só funciona se: (a) ainda não existir nenhum admin, e (b) o header
// x-setup-secret bater com a env SETUP_SECRET. Depois do primeiro admin
// criado, este endpoint sempre retorna 403 — use isso pra reduzir o risco
// de alguém criar um admin não autorizado num site público na Vercel.
// ============================================================================
import { NextResponse } from "next/server";
import { sql, ensureSchema } from "../../../../lib/db.js";
import { hashPassword } from "../../../../lib/auth.js";

export async function POST(req) {
  try {
    await ensureSchema();

    const setupSecret = process.env.SETUP_SECRET;
    const providedSecret = req.headers.get("x-setup-secret");
    if (!setupSecret || providedSecret !== setupSecret) {
      return NextResponse.json({ ok: false, error: "Segredo de setup inválido" }, { status: 403 });
    }

    const existing = await sql`SELECT id FROM admins LIMIT 1`;
    if (existing.length > 0) {
      return NextResponse.json({ ok: false, error: "Já existe um admin — use /login" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    if (username.length < 3) return NextResponse.json({ ok: false, error: "Usuário precisa ter ao menos 3 caracteres" }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ ok: false, error: "Senha precisa ter ao menos 6 caracteres" }, { status: 400 });

    const hash = hashPassword(password);
    await sql`INSERT INTO admins (username, password_hash) VALUES (${username}, ${hash})`;

    return NextResponse.json({ ok: true, username });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { sql, ensureSchema } from "../../../../lib/db.js";
import { comparePassword, signSession, SESSION_COOKIE } from "../../../../lib/auth.js";

export async function POST(req) {
  try {
    await ensureSchema();
    const body = await req.json().catch(() => ({}));
    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    const rows = await sql`SELECT id, username, password_hash FROM admins WHERE username = ${username}`;
    const admin = rows[0];
    if (!admin || !comparePassword(password, admin.password_hash)) {
      return NextResponse.json({ ok: false, error: "Usuário ou senha inválidos" }, { status: 401 });
    }

    await sql`UPDATE admins SET last_login_at = now() WHERE id = ${admin.id}`;

    const token = await signSession({ id: admin.id, username: admin.username });
    const res = NextResponse.json({ ok: true, username: admin.username });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    });
    return res;
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

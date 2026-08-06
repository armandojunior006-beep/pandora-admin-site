import { NextResponse } from "next/server";
import { sql } from "../../../../lib/db.js";
import { hashPassword } from "../../../../lib/auth.js";

export async function PATCH(req, { params }) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);
    const body = await req.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    const contact = String(body.contact || "").trim();
    const notes = String(body.notes || "").trim();
    const status = String(body.status || "ativo").trim();
    const password = String(body.password || "");

    if (password && password.length < 6) {
      return NextResponse.json({ ok: false, error: "Senha precisa ter ao menos 6 caracteres (ou deixe vazio pra não alterar)" }, { status: 400 });
    }

    const rows = password
      ? await sql`
          UPDATE users SET name = ${name}, contact = ${contact}, notes = ${notes}, status = ${status},
                            password_hash = ${hashPassword(password)}, updated_at = now()
          WHERE id = ${id}
          RETURNING id, name, login, contact, notes, status, created_at, (password_hash IS NOT NULL) AS has_password
        `
      : await sql`
          UPDATE users SET name = ${name}, contact = ${contact}, notes = ${notes}, status = ${status}, updated_at = now()
          WHERE id = ${id}
          RETURNING id, name, login, contact, notes, status, created_at, (password_hash IS NOT NULL) AS has_password
        `;
    if (!rows.length) return NextResponse.json({ ok: false, error: "Usuário não encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true, user: rows[0] });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);
    // ON DELETE CASCADE na FK de licenses cuida de remover as licenças do usuário junto.
    await sql`DELETE FROM users WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

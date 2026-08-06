import { NextResponse } from "next/server";
import { sql } from "../../../../lib/db.js";

export async function PATCH(req, { params }) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);
    const body = await req.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    const durationDays = body.durationDays === "" || body.durationDays == null ? null : Number(body.durationDays);
    const priceCents = Math.round(Number(body.priceCents) || 0);
    const active = !!body.active;

    const rows = await sql`
      UPDATE plans SET name = ${name}, duration_days = ${durationDays}, price_cents = ${priceCents}, active = ${active}
      WHERE id = ${id}
      RETURNING id, name, duration_days, price_cents, active, created_at
    `;
    if (!rows.length) return NextResponse.json({ ok: false, error: "Plano não encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true, plan: rows[0] });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);
    // Licenças que usam este plano ficam com plan_id NULL (ON DELETE SET NULL) — não some o histórico do cliente.
    await sql`DELETE FROM plans WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

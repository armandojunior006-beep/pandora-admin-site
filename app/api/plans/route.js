import { NextResponse } from "next/server";
import { sql, ensureSchema } from "../../../lib/db.js";

export async function GET() {
  await ensureSchema();
  const rows = await sql`SELECT id, name, duration_days, price_cents, active, created_at FROM plans ORDER BY id DESC`;
  return NextResponse.json({ ok: true, plans: rows });
}

export async function POST(req) {
  try {
    await ensureSchema();
    const body = await req.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    const durationDays = body.durationDays === "" || body.durationDays == null ? null : Number(body.durationDays);
    const priceCents = Math.round(Number(body.priceCents) || 0);
    if (!name) return NextResponse.json({ ok: false, error: "Nome do plano é obrigatório" }, { status: 400 });

    const rows = await sql`
      INSERT INTO plans (name, duration_days, price_cents)
      VALUES (${name}, ${durationDays}, ${priceCents})
      RETURNING id, name, duration_days, price_cents, active, created_at
    `;
    return NextResponse.json({ ok: true, plan: rows[0] });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

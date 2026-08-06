import { NextResponse } from "next/server";
import { sql, ensureSchema, slugify } from "../../../lib/db.js";

export async function GET() {
  await ensureSchema();
  const rows = await sql`SELECT id, key, name, duration_days, price_cents, active, created_at FROM plans ORDER BY id DESC`;
  return NextResponse.json({ ok: true, plans: rows });
}

async function uniqueKey(base, excludeId) {
  let key = base || "plano";
  let n = 1;
  for (;;) {
    const clash = excludeId
      ? await sql`SELECT id FROM plans WHERE key = ${key} AND id != ${excludeId}`
      : await sql`SELECT id FROM plans WHERE key = ${key}`;
    if (!clash.length) return key;
    n += 1;
    key = `${base}-${n}`;
  }
}

export async function POST(req) {
  try {
    await ensureSchema();
    const body = await req.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    const durationDays = body.durationDays === "" || body.durationDays == null ? null : Number(body.durationDays);
    const priceCents = Math.round(Number(body.priceCents) || 0);
    if (!name) return NextResponse.json({ ok: false, error: "Nome do plano é obrigatório" }, { status: 400 });

    const key = await uniqueKey(slugify(name));
    const rows = await sql`
      INSERT INTO plans (key, name, duration_days, price_cents)
      VALUES (${key}, ${name}, ${durationDays}, ${priceCents})
      RETURNING id, key, name, duration_days, price_cents, active, created_at
    `;
    return NextResponse.json({ ok: true, plan: rows[0] });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

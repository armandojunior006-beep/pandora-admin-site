// ============================================================================
// GET /api/public/plans — usado pela tela "Comprar Token" do app (PlansModal).
// Público (sem auth), só planos ativos.
// ============================================================================
import { NextResponse } from "next/server";
import { sql, ensureSchema } from "../../../../lib/db.js";
import { withCors, CORS_HEADERS } from "../../../../lib/cors.js";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  await ensureSchema();
  const rows = await sql`
    SELECT key, name, price_cents, duration_days
    FROM plans
    WHERE active = true AND key IS NOT NULL
    ORDER BY price_cents ASC
  `;
  const plans = rows.map((p) => ({
    key: p.key,
    label: p.name,
    price_cents: p.price_cents,
    duration_days: p.duration_days,
  }));
  return withCors(NextResponse.json({ ok: true, plans }));
}

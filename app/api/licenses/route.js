import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { sql, ensureSchema } from "../../../lib/db.js";

function genToken() {
  return "pdr_" + crypto.randomBytes(24).toString("hex");
}

export async function GET() {
  await ensureSchema();
  const rows = await sql`
    SELECT l.id, l.token, l.status, l.device_hwid, l.starts_at, l.expires_at, l.created_at,
           u.id AS user_id, u.name AS user_name, u.login AS user_login,
           p.id AS plan_id, p.name AS plan_name
    FROM licenses l
    JOIN users u ON u.id = l.user_id
    LEFT JOIN plans p ON p.id = l.plan_id
    ORDER BY l.id DESC
  `;
  return NextResponse.json({ ok: true, licenses: rows });
}

export async function POST(req) {
  try {
    await ensureSchema();
    const body = await req.json().catch(() => ({}));
    const userId = Number(body.userId);
    const planId = body.planId ? Number(body.planId) : null;
    if (!userId) return NextResponse.json({ ok: false, error: "Selecione um usuário" }, { status: 400 });

    let durationDays = null;
    if (planId) {
      const planRows = await sql`SELECT duration_days FROM plans WHERE id = ${planId}`;
      if (!planRows.length) return NextResponse.json({ ok: false, error: "Plano não encontrado" }, { status: 400 });
      durationDays = planRows[0].duration_days;
    }

    const token = genToken();
    const rows = durationDays
      ? await sql`
          INSERT INTO licenses (user_id, plan_id, token, expires_at)
          VALUES (${userId}, ${planId}, ${token}, now() + make_interval(days => ${durationDays}))
          RETURNING id, token, status, device_hwid, starts_at, expires_at, created_at
        `
      : await sql`
          INSERT INTO licenses (user_id, plan_id, token, expires_at)
          VALUES (${userId}, ${planId}, ${token}, NULL)
          RETURNING id, token, status, device_hwid, starts_at, expires_at, created_at
        `;

    return NextResponse.json({ ok: true, license: rows[0] });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

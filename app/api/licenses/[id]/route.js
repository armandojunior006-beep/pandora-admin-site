import { NextResponse } from "next/server";
import { sql } from "../../../../lib/db.js";

// Ações suportadas no body: { action: "setStatus", status } | { action: "renew" } | { action: "setDeviceHwid", deviceHwid }
export async function PATCH(req, { params }) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);
    const body = await req.json().catch(() => ({}));

    if (body.action === "setStatus") {
      const status = String(body.status || "").trim();
      if (!["ativo", "suspenso", "expirado"].includes(status)) {
        return NextResponse.json({ ok: false, error: "Status inválido" }, { status: 400 });
      }
      const rows = await sql`UPDATE licenses SET status = ${status} WHERE id = ${id} RETURNING id`;
      if (!rows.length) return NextResponse.json({ ok: false, error: "Licença não encontrada" }, { status: 404 });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "renew") {
      const rows = await sql`
        SELECT l.id, l.expires_at, p.duration_days
        FROM licenses l LEFT JOIN plans p ON p.id = l.plan_id
        WHERE l.id = ${id}
      `;
      if (!rows.length) return NextResponse.json({ ok: false, error: "Licença não encontrada" }, { status: 404 });
      const { duration_days } = rows[0];
      if (!duration_days) {
        return NextResponse.json({ ok: false, error: "Licença vitalícia (ou sem plano) não precisa renovar" }, { status: 400 });
      }
      // Renova a partir de agora (ou do vencimento futuro, se ainda não venceu) + duração do plano.
      await sql`
        UPDATE licenses
        SET expires_at = GREATEST(now(), COALESCE(expires_at, now())) + make_interval(days => ${duration_days}),
            status = 'ativo'
        WHERE id = ${id}
      `;
      return NextResponse.json({ ok: true });
    }

    if (body.action === "setDeviceHwid") {
      await sql`UPDATE licenses SET device_hwid = ${String(body.deviceHwid || "") || null} WHERE id = ${id}`;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "Ação desconhecida" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);
    await sql`DELETE FROM licenses WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

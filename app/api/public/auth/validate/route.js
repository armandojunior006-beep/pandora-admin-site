// ============================================================================
// POST /api/public/auth/validate — heartbeat chamado pelo App.tsx a cada 5min.
// Body: { token, device_hash }. O app tenta assinar com HMAC (headers
// x-pandora-ts/x-pandora-sig via security.cjs) mas não exigimos/verificamos
// essa assinatura aqui — o segredo usado por security.cjs não é nosso.
// Resposta: { ok:true, valid:boolean, reason? }
// ============================================================================
import { NextResponse } from "next/server";
import { sql, ensureSchema } from "../../../../../lib/db.js";
import { withCors, CORS_HEADERS } from "../../../../../lib/cors.js";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req) {
  try {
    await ensureSchema();
    const body = await req.json().catch(() => ({}));
    const token = String(body.token || "").trim();
    const deviceHash = String(body.device_hash || "").trim();

    if (!token) return withCors(NextResponse.json({ ok: true, valid: false, reason: "token_ausente" }));

    const rows = await sql`
      SELECT l.id, l.status, l.expires_at, l.device_hwid, u.status AS user_status
      FROM licenses l
      JOIN users u ON u.id = l.user_id
      WHERE l.token = ${token}
    `;
    const lic = rows[0];
    if (!lic) return withCors(NextResponse.json({ ok: true, valid: false, reason: "token_invalido" }));
    if (lic.user_status !== "ativo") return withCors(NextResponse.json({ ok: true, valid: false, reason: "usuario_bloqueado" }));
    if (lic.status === "suspenso") return withCors(NextResponse.json({ ok: true, valid: false, reason: "suspensa" }));

    const isExpired = lic.expires_at && new Date(lic.expires_at).getTime() <= Date.now();
    if (isExpired || lic.status === "expirado") {
      if (lic.status !== "expirado") await sql`UPDATE licenses SET status = 'expirado' WHERE id = ${lic.id}`;
      return withCors(NextResponse.json({ ok: true, valid: false, reason: "expirada" }));
    }
    if (lic.device_hwid && deviceHash && lic.device_hwid !== deviceHash) {
      return withCors(NextResponse.json({ ok: true, valid: false, reason: "outro_dispositivo" }));
    }

    return withCors(NextResponse.json({ ok: true, valid: true }));
  } catch (e) {
    // Erro de infra: NÃO retorna valid:false (isso derrubaria a sessão do
    // usuário por instabilidade) — o app já trata exceção como "offline, não desloga".
    return withCors(NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 }));
  }
}

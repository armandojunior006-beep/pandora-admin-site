// ============================================================================
// GET /api/public/payments/[id]/status — polling do PlansModal.tsx enquanto
// aguarda a confirmação do Pix. Não chama a MisticPay a cada request (o
// webhook é quem atualiza o status); só confere o que está salvo no banco.
// ============================================================================
import { NextResponse } from "next/server";
import { sql, ensureSchema } from "../../../../../../lib/db.js";
import { withCors, CORS_HEADERS } from "../../../../../../lib/cors.js";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req, { params }) {
  try {
    await ensureSchema();
    const { id: idParam } = await params;
    const id = Number(idParam);
    if (!id) return withCors(NextResponse.json({ ok: false, error: "id inválido" }, { status: 400 }));

    // Segurança 2026-08-18 (IDOR corrigido): id sozinho é sequencial e
    // adivinhável — sem o poll_token devolvido na criação (só pra quem
    // criou o pagamento), qualquer um incrementando o id conseguia ler o
    // license_token de pagamentos de outra pessoa assim que confirmassem.
    const token = new URL(req.url).searchParams.get("token") || "";
    const rows = await sql`SELECT status, license_token, poll_token FROM payments WHERE id = ${id}`;
    if (!rows.length) return withCors(NextResponse.json({ ok: false, error: "Pagamento não encontrado" }, { status: 404 }));
    if (!token || token !== rows[0].poll_token) {
      return withCors(NextResponse.json({ ok: false, error: "Não autorizado" }, { status: 403 }));
    }

    const p = rows[0];
    const status = p.status === "pago" ? "paid" : p.status === "falhou" ? "failed" : "pending";
    return withCors(NextResponse.json({ ok: true, status, token: p.license_token || undefined }));
  } catch (e) {
    return withCors(NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 }));
  }
}

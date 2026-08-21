// ============================================================================
// POST /api/licenses/validate — chamado pelo BOT (Electron), não pelo painel.
// Sem cookie de admin (é uma máquina cliente falando com o servidor), a
// segurança aqui é o próprio token (imprevisível, 24 bytes aleatórios).
//
// Body: { token: string, deviceHwid: string }
// Resposta sempre 200 (o "resultado" vem em valid/reason, não no HTTP status)
// pra facilitar o lado do bot tratar sem precisar diferenciar erro de rede
// de licença inválida.
//
// Regras:
//   - token não existe            -> valid:false, reason:"token_invalido"
//   - status != 'ativo'           -> valid:false, reason:"suspensa"
//   - expires_at no passado       -> marca status='expirado', valid:false, reason:"expirada"
//   - device_hwid vazio           -> primeira ativação: grava o HWID recebido, valid:true
//   - device_hwid != o recebido   -> valid:false, reason:"outro_dispositivo"
//   - tudo certo                  -> valid:true
// ============================================================================
import { NextResponse } from "next/server";
import { sql, ensureSchema } from "../../../../lib/db.js";
import { checkRateLimit, getClientIp } from "../../../../lib/rateLimit.js";

export async function POST(req) {
  try {
    await ensureSchema();
    // Segurança 2026-08-18: rate limit — limite mais alto que login (60/min)
    // porque o bot também usa essa rota pra checar a licença periodicamente,
    // não só pra "login"; ainda barra tentativa de força bruta em token.
    const rl = await checkRateLimit(`license-validate:${getClientIp(req)}`, { max: 60, windowMs: 60_000 });
    if (!rl.allowed) return NextResponse.json({ ok: false, error: "Muitas tentativas — aguarde um instante" }, { status: 429 });
    const body = await req.json().catch(() => ({}));
    const token = String(body.token || "").trim();
    const deviceHwid = String(body.deviceHwid || "").trim();

    if (!token) {
      return NextResponse.json({ ok: true, valid: false, reason: "token_ausente" });
    }

    const rows = await sql`
      SELECT l.id, l.status, l.expires_at, l.device_hwid,
             u.name AS user_name, u.status AS user_status,
             p.name AS plan_name
      FROM licenses l
      JOIN users u ON u.id = l.user_id
      LEFT JOIN plans p ON p.id = l.plan_id
      WHERE l.token = ${token}
    `;
    const lic = rows[0];
    if (!lic) {
      return NextResponse.json({ ok: true, valid: false, reason: "token_invalido" });
    }

    if (lic.user_status !== "ativo") {
      return NextResponse.json({ ok: true, valid: false, reason: "usuario_bloqueado" });
    }

    if (lic.status === "suspenso") {
      return NextResponse.json({ ok: true, valid: false, reason: "suspensa" });
    }

    const isExpired = lic.expires_at && new Date(lic.expires_at).getTime() <= Date.now();
    if (isExpired || lic.status === "expirado") {
      if (lic.status !== "expirado") {
        await sql`UPDATE licenses SET status = 'expirado' WHERE id = ${lic.id}`;
      }
      return NextResponse.json({ ok: true, valid: false, reason: "expirada" });
    }

    if (!lic.device_hwid && deviceHwid) {
      // Primeira ativação — vincula esta licença a este dispositivo.
      await sql`UPDATE licenses SET device_hwid = ${deviceHwid} WHERE id = ${lic.id}`;
    } else if (lic.device_hwid && deviceHwid && lic.device_hwid !== deviceHwid) {
      return NextResponse.json({ ok: true, valid: false, reason: "outro_dispositivo" });
    }

    return NextResponse.json({
      ok: true,
      valid: true,
      userName: lic.user_name,
      planName: lic.plan_name || null,
      expiresAt: lic.expires_at,
    });
  } catch (e) {
    // Erro de infraestrutura (banco fora, etc.) — não é "licença inválida",
    // é "não deu pra checar". O bot decide separadamente o que fazer nesse caso.
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

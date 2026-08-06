// ============================================================================
// POST /api/public/payments/create — compra automática de plano via Pix
// (Mistic Pay). Ainda NÃO implementado — o fluxo funcional hoje é o admin
// gerar o token manualmente no painel (aba Licenças) e o cliente colar no
// botão "Token" da tela de login. Retorna erro claro em vez de deixar a UI
// travada esperando uma resposta que nunca vem.
// ============================================================================
import { NextResponse } from "next/server";
import { withCors, CORS_HEADERS } from "../../../../../lib/cors.js";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST() {
  return withCors(NextResponse.json(
    { ok: false, error: "Compra automática por Pix ainda não configurada. Peça um token ao suporte." },
    { status: 501 }
  ));
}

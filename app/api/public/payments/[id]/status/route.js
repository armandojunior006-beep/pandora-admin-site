import { NextResponse } from "next/server";
import { withCors, CORS_HEADERS } from "../../../../../../lib/cors.js";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  return withCors(NextResponse.json(
    { ok: false, error: "Pagamentos automáticos ainda não configurados." },
    { status: 501 }
  ));
}

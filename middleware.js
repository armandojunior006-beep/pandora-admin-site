import { NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE } from "./lib/auth.js";

// Segurança 2026-08-18 (CRÍTICO corrigido — controle de acesso quebrado):
// /api/users, /api/licenses e /api/plans (CRUD do admin) nunca chamavam
// verifySession — qualquer um na internet podia listar/criar/editar/apagar
// usuários, licenças (inclusive tokens ativos) e planos sem login nenhum.
// Corrige aqui, no middleware — um lugar só, todas as rotas de admin
// passam por aqui, em vez de repetir a checagem em cada arquivo de rota.
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/users/:path*",
    "/api/licenses/:path*",
    "/api/plans/:path*",
  ],
};

// /api/licenses/validate é a ÚNICA rota de admin que precisa ficar pública —
// é chamada pelo bot (Electron), sem cookie de sessão, pra validar o token
// de licença do próprio usuário do bot.
const PUBLIC_API_EXCEPTIONS = ["/api/licenses/validate"];

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_API_EXCEPTIONS.includes(pathname)) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ ok: false, error: "Não autorizado" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

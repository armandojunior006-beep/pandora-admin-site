// ============================================================================
// CORS para as rotas /api/public/* — chamadas via fetch() de dentro do
// Electron (origem "file://" em produção, "http://localhost:5173" em dev,
// ambas sem Access-Control-Allow-Origin por padrão = fetch falha). Essas
// rotas já são protegidas por senha/token no corpo da própria requisição,
// então liberar CORS geral aqui é seguro (não usam cookie de sessão).
// ============================================================================
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-pandora-ts, x-pandora-sig",
};

export function withCors(response) {
  for (const [k, v] of Object.entries(CORS_HEADERS)) response.headers.set(k, v);
  return response;
}

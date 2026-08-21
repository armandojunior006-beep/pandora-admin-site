// ============================================================================
// Segurança 2026-08-18: rate limit simples por IP+rota, usando o Postgres
// que já existe (sem Redis/Upstash configurado neste projeto — se o
// tráfego crescer a ponto do driver serverless do Neon virar gargalo aqui,
// trocar por Upstash Ratelimit é o próximo passo natural).
// Janela fixa (não deslizante): cada bucket_key acumula tentativas até
// reset_at, depois zera. Suficiente pra barrar força bruta.
// ============================================================================
import { sql, ensureSchema } from "./db.js";

export function getClientIp(req) {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

// Retorna { allowed, remaining, resetAt }. `key` deve identificar rota+IP
// (ex.: "login:1.2.3.4") pra não misturar limites de endpoints diferentes.
export async function checkRateLimit(key, { max = 10, windowMs = 60_000 } = {}) {
  await ensureSchema();
  const resetAt = new Date(Date.now() + windowMs);
  const rows = await sql`
    INSERT INTO rate_limits (bucket_key, count, reset_at)
    VALUES (${key}, 1, ${resetAt})
    ON CONFLICT (bucket_key) DO UPDATE SET
      count = CASE WHEN rate_limits.reset_at < now() THEN 1 ELSE rate_limits.count + 1 END,
      reset_at = CASE WHEN rate_limits.reset_at < now() THEN ${resetAt} ELSE rate_limits.reset_at END
    RETURNING count, reset_at
  `;
  const row = rows[0];
  return { allowed: row.count <= max, remaining: Math.max(0, max - row.count), resetAt: row.reset_at };
}

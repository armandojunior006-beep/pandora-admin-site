import { sql, ensureSchema } from "../../lib/db.js";

export const dynamic = "force-dynamic";

async function getStats() {
  await ensureSchema();
  const [users, activeLicenses, expiringSoon, expired] = await Promise.all([
    sql`SELECT COUNT(*)::int AS n FROM users`,
    sql`SELECT COUNT(*)::int AS n FROM licenses WHERE status = 'ativo' AND (expires_at IS NULL OR expires_at > now())`,
    sql`SELECT COUNT(*)::int AS n FROM licenses WHERE status = 'ativo' AND expires_at IS NOT NULL AND expires_at > now() AND expires_at < now() + interval '3 days'`,
    sql`SELECT COUNT(*)::int AS n FROM licenses WHERE status = 'ativo' AND expires_at IS NOT NULL AND expires_at <= now()`,
  ]);
  return {
    users: users[0].n,
    activeLicenses: activeLicenses[0].n,
    expiringSoon: expiringSoon[0].n,
    expired: expired[0].n,
  };
}

export default async function DashboardHome() {
  const stats = await getStats();
  return (
    <div>
      <h1>Visão geral</h1>
      <p className="page-subtitle">Resumo dos seus clientes e licenças do Pandora BOT</p>

      <div className="stat-grid">
        <div className="card stat-card">
          <div className="value">{stats.users}</div>
          <div className="label">Usuários cadastrados</div>
        </div>
        <div className="card stat-card">
          <div className="value">{stats.activeLicenses}</div>
          <div className="label">Licenças ativas</div>
        </div>
        <div className="card stat-card">
          <div className="value" style={{ color: "var(--warn)" }}>{stats.expiringSoon}</div>
          <div className="label">Vencendo em 3 dias</div>
        </div>
        <div className="card stat-card">
          <div className="value" style={{ color: "var(--danger)" }}>{stats.expired}</div>
          <div className="label">Vencidas (a limpar)</div>
        </div>
      </div>

      <div className="card">
        <strong>Fluxo rápido:</strong>
        <ol style={{ color: "var(--text-dim)", lineHeight: 1.9 }}>
          <li>Cadastre um <a href="/dashboard/plans">plano</a> (ex: Mensal, 30 dias).</li>
          <li>Cadastre o <a href="/dashboard/users">usuário/cliente</a>.</li>
          <li>Gere uma <a href="/dashboard/licenses">licença/token</a> vinculando usuário + plano.</li>
          <li>Copie o token gerado e envie pro cliente configurar no bot.</li>
        </ol>
      </div>
    </div>
  );
}

import { sql, ensureSchema } from "../../../lib/db.js";
import LicensesClient from "./LicensesClient.js";

export const dynamic = "force-dynamic";

export default async function LicensesPage() {
  await ensureSchema();
  const [licenses, users, plans] = await Promise.all([
    sql`
      SELECT l.id, l.token, l.status, l.device_hwid, l.starts_at, l.expires_at, l.created_at,
             u.id AS user_id, u.name AS user_name, u.login AS user_login,
             p.id AS plan_id, p.name AS plan_name
      FROM licenses l
      JOIN users u ON u.id = l.user_id
      LEFT JOIN plans p ON p.id = l.plan_id
      ORDER BY l.id DESC
    `,
    sql`SELECT id, name, login FROM users WHERE status = 'ativo' ORDER BY name`,
    sql`SELECT id, name, duration_days FROM plans WHERE active = true ORDER BY name`,
  ]);
  return (
    <div>
      <h1>Licenças / Tokens</h1>
      <p className="page-subtitle">Gere, renove e suspenda os tokens de acesso de cada cliente</p>
      <LicensesClient initialLicenses={licenses} users={users} plans={plans} />
    </div>
  );
}

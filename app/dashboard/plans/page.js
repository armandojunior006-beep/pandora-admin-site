import { sql, ensureSchema } from "../../../lib/db.js";
import PlansClient from "./PlansClient.js";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  await ensureSchema();
  const plans = await sql`SELECT id, name, duration_days, price_cents, active, created_at FROM plans ORDER BY id DESC`;
  return (
    <div>
      <h1>Planos</h1>
      <p className="page-subtitle">Planos de assinatura oferecidos aos clientes</p>
      <PlansClient initialPlans={plans} />
    </div>
  );
}

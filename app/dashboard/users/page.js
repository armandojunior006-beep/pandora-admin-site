import { sql, ensureSchema } from "../../../lib/db.js";
import UsersClient from "./UsersClient.js";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await ensureSchema();
  const users = await sql`SELECT id, name, login, contact, notes, status, created_at FROM users ORDER BY id DESC`;
  return (
    <div>
      <h1>Usuários</h1>
      <p className="page-subtitle">Clientes que usam o Pandora BOT</p>
      <UsersClient initialUsers={users} />
    </div>
  );
}

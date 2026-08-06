// ============================================================================
// Conexão com o Neon Postgres via driver serverless (funciona em Vercel
// Serverless Functions e em Edge Runtime, sem pool de conexões TCP).
// ============================================================================
import { neon } from "@neondatabase/serverless";

let _sql = null;
function getSql() {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL não configurada (.env.local ou Vercel Environment Variables)");
    _sql = neon(url);
  }
  return _sql;
}

// Uso: await sql`SELECT * FROM users WHERE id = ${id}` — o driver já faz
// parametrização segura (protege contra SQL injection).
export function sql(strings, ...values) {
  return getSql()(strings, ...values);
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS admins (
  id            SERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS plans (
  id            SERIAL PRIMARY KEY,
  key           TEXT UNIQUE,          -- slug estável usado pelo app (Login.tsx / cloud-api.ts)
  name          TEXT NOT NULL,
  duration_days INTEGER,
  price_cents   INTEGER NOT NULL DEFAULT 0,
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  login         TEXT UNIQUE NOT NULL,
  password_hash TEXT,                  -- senha que o cliente usa para logar NO BOT (não no painel)
  cpf           TEXT,                  -- capturado no cadastro feito pelo próprio app (tela "Criar conta")
  contact       TEXT,
  notes         TEXT,
  status        TEXT NOT NULL DEFAULT 'ativo',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS licenses (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id      INTEGER REFERENCES plans(id) ON DELETE SET NULL,
  token        TEXT UNIQUE NOT NULL,
  device_hwid  TEXT,
  status       TEXT NOT NULL DEFAULT 'ativo',
  starts_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_licenses_user_id ON licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_licenses_token ON licenses(token);
`;

// Chamado sob demanda (não a cada request) para garantir que as tabelas
// existem — idempotente, seguro de rodar toda vez que o app "esfria" (cold start).
// Executa uma instrução por vez (o driver HTTP do Neon espera um statement
// por chamada quando não é uma tagged template).
export async function ensureSchema() {
  const client = getSql();
  const statements = SCHEMA_SQL.split(";").map((s) => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    await client(stmt);
  }
  // Migração: bancos criados antes da coluna existir (CREATE TABLE IF NOT
  // EXISTS não adiciona coluna em tabela já existente).
  await client("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT");
  await client("ALTER TABLE users ADD COLUMN IF NOT EXISTS cpf TEXT");
  await client("ALTER TABLE plans ADD COLUMN IF NOT EXISTS key TEXT");
  // Preenche "key" das linhas antigas que não tinham essa coluna (slug a partir do nome).
  await client(`
    UPDATE plans SET key = lower(regexp_replace(regexp_replace(unaccent(name), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))
    WHERE key IS NULL
  `).catch(() => {}); // unaccent pode não estar habilitado — não é crítico, plano fica sem key até editar
}

export function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // remove acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

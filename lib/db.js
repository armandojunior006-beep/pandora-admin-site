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

-- Cobranças Pix (MisticPay) geradas pela tela "Comprar Token" do app.
-- new_login/new_password_hash guardam a conta a criar quando o pagamento é
-- feito ANTES de existir usuário (fluxo "criar conta e já comprar").
CREATE TABLE IF NOT EXISTS payments (
  id                 SERIAL PRIMARY KEY,
  provider           TEXT NOT NULL DEFAULT 'misticpay',
  provider_tx_id     TEXT UNIQUE NOT NULL,
  plan_id            INTEGER REFERENCES plans(id) ON DELETE SET NULL,
  user_id            INTEGER REFERENCES users(id) ON DELETE SET NULL,
  new_login          TEXT,
  new_password_hash  TEXT,
  amount_cents       INTEGER NOT NULL,
  status             TEXT NOT NULL DEFAULT 'pendente', -- pendente | pago | falhou
  qr_code_text       TEXT,
  qr_code_image      TEXT,
  license_token      TEXT,
  -- Segurança 2026-08-18 (IDOR corrigido): /status era autorizado só pelo id
  -- sequencial do pagamento — dava pra enumerar ids e roubar o license_token
  -- de pagamentos de outra pessoa assim que confirmassem. Token opaco
  -- gerado na criação, devolvido só pra quem criou o pagamento, exigido
  -- pra consultar o status.
  poll_token         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_provider_tx_id ON payments(provider_tx_id);

-- Segurança 2026-08-18: contador de rate limit por IP+rota (ver
-- lib/rateLimit.js). Sem Redis/Upstash configurado neste projeto — usa o
-- Postgres que já existe, janela fixa simples (reset_at), suficiente pra
-- barrar força bruta sem precisar de infra nova.
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket_key TEXT PRIMARY KEY,
  count      INTEGER NOT NULL DEFAULT 0,
  reset_at   TIMESTAMPTZ NOT NULL
);
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
  await client("ALTER TABLE payments ADD COLUMN IF NOT EXISTS poll_token TEXT");
  // Preenche "key" das linhas antigas que não tinham essa coluna. Gerado em JS
  // (slugify() abaixo) em vez de depender da extensão unaccent do Postgres —
  // no Neon ela normalmente não está habilitada, e a versão anterior dessa
  // migração falhava silenciosamente, deixando planos com key=NULL para
  // sempre (o que os escondia do endpoint público /api/public/plans, que
  // filtra "key IS NOT NULL").
  const noKey = await sql`SELECT id, name FROM plans WHERE key IS NULL`;
  for (const row of noKey) {
    let base = slugify(row.name) || `plano-${row.id}`;
    let key = base;
    let n = 1;
    // Evita colisão de key entre planos com nomes que geram o mesmo slug.
    // Tagged template (parametrizado) — nunca concatena string na query.
    while (true) {
      const dup = await sql`SELECT id FROM plans WHERE key = ${key} AND id != ${row.id}`;
      if (!dup.length) break;
      key = `${base}-${++n}`;
    }
    await sql`UPDATE plans SET key = ${key} WHERE id = ${row.id}`;
  }
}

export function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // remove acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

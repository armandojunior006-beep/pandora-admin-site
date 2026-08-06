-- ============================================================================
-- Schema do painel Pandora BOT (Postgres / Neon).
-- Rode isto uma vez no seu banco Neon (SQL Editor do console, ou psql).
-- Também é aplicado automaticamente pelo scripts/create-admin.mjs na
-- primeira vez que ele roda (CREATE TABLE IF NOT EXISTS é idempotente).
-- ============================================================================

CREATE TABLE IF NOT EXISTS admins (
  id            SERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS plans (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  duration_days INTEGER,              -- NULL = vitalício
  price_cents   INTEGER NOT NULL DEFAULT 0,
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  login      TEXT UNIQUE NOT NULL,     -- login que o cliente usa no bot
  contact    TEXT,                     -- whatsapp/e-mail, opcional
  notes      TEXT,
  status     TEXT NOT NULL DEFAULT 'ativo',  -- ativo | bloqueado
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS licenses (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id      INTEGER REFERENCES plans(id) ON DELETE SET NULL,
  token        TEXT UNIQUE NOT NULL,   -- token de acesso/licença do cliente
  device_hwid  TEXT,                   -- preenchido quando o bot ativar a licença nesse PC
  status       TEXT NOT NULL DEFAULT 'ativo',  -- ativo | suspenso | expirado
  starts_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ,            -- NULL = sem expiração (vitalício)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_licenses_user_id ON licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_licenses_token ON licenses(token);

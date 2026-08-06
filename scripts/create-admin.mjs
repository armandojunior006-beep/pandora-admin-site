#!/usr/bin/env node
// ============================================================================
// Cria (ou reseta a senha de) o admin do painel, direto no banco Neon.
//
// Uso:
//   npm run create-admin -- <usuario> <senha>
//
// Precisa de DATABASE_URL configurada em .env.local (mesmo valor que você
// vai colocar nas Environment Variables da Vercel).
// ============================================================================
import fs from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const key = m[1];
    let value = m[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  loadEnvLocal();
  const [, , username, password] = process.argv;
  if (!username || !password) {
    console.error("Uso: npm run create-admin -- <usuario> <senha>");
    process.exit(1);
  }
  if (password.length < 6) {
    console.error("A senha precisa ter ao menos 6 caracteres.");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL não encontrada. Configure em .env.local (veja .env.example).");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  await sql(`
    CREATE TABLE IF NOT EXISTS admins (
      id            SERIAL PRIMARY KEY,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_login_at TIMESTAMPTZ
    )
  `);

  const hash = bcrypt.hashSync(password, 10);
  const existing = await sql("SELECT id FROM admins WHERE username = $1", [username]);

  if (existing.length) {
    await sql("UPDATE admins SET password_hash = $1 WHERE id = $2", [hash, existing[0].id]);
    console.log(`[create-admin] senha atualizada para o admin existente "${username}".`);
  } else {
    await sql("INSERT INTO admins (username, password_hash) VALUES ($1, $2)", [username, hash]);
    console.log(`[create-admin] admin "${username}" criado com sucesso.`);
  }
  console.log("[create-admin] pronto — acesse /login no site com essas credenciais.");
}

main().catch((e) => {
  console.error("[create-admin] falhou:", e && e.stack || e);
  process.exit(1);
});

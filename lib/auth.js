// ============================================================================
// Autenticação do admin: hash de senha (bcrypt) + sessão via cookie
// httpOnly assinado com JWT (jose — funciona em Edge Runtime, usado pelo
// middleware.js para proteger /dashboard/*).
// ============================================================================
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

export const SESSION_COOKIE = "pandora_admin_session";
const SESSION_DURATION = "7d";

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET não configurada");
  return new TextEncoder().encode(secret);
}

export function hashPassword(password) {
  return bcrypt.hashSync(String(password), 10);
}

export function comparePassword(password, hash) {
  return bcrypt.compareSync(String(password || ""), String(hash || ""));
}

export async function signSession({ id, username }) {
  return new SignJWT({ id, username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecretKey());
}

// Retorna o payload { id, username } se o token for válido, ou null.
export async function verifySession(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload;
  } catch {
    return null;
  }
}

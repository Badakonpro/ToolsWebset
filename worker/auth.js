export const ACCOUNT_COOKIE = "lt_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
export const PASSWORD_ALGORITHM = "pbkdf2-sha256-10000";
const PBKDF2_ITERATIONS = 10000;

export class AuthError extends Error {
  constructor(status, detail, code = "auth_error") {
    super(detail);
    this.name = "AuthError";
    this.status = status;
    this.detail = detail;
    this.code = code;
  }
}

function requireCrypto() {
  if (!globalThis.crypto?.subtle) {
    throw new AuthError(500, "Web Crypto is unavailable.", "crypto_unavailable");
  }
  return globalThis.crypto;
}

function requireDb(env) {
  if (!env?.DB) {
    throw new AuthError(503, "Account database is not configured.", "account_db_unconfigured");
  }
  return env.DB;
}

function bytesToHex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function randomHex(byteLength) {
  const bytes = new Uint8Array(byteLength);
  requireCrypto().getRandomValues(bytes);
  return bytesToHex(bytes);
}

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

export function sanitizeDisplayName(value, email) {
  const fallback = normalizeEmail(email).split("@")[0] || "user";
  return String(value || fallback).trim().slice(0, 60) || fallback;
}

function timingSafeEqualHex(left, right) {
  if (left.length !== right.length) {
    return false;
  }
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

export async function sha256Hex(value) {
  const digest = await requireCrypto().subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

async function derivePasswordHash(password, saltHex) {
  const key = await requireCrypto().subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await requireCrypto().subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: hexToBytes(saltHex),
      iterations: PBKDF2_ITERATIONS,
    },
    key,
    256,
  );
  return bytesToHex(new Uint8Array(bits));
}

export async function createPasswordRecord(password) {
  const cleanPassword = String(password || "");
  if (cleanPassword.length < 8) {
    throw new AuthError(400, "Password must be at least 8 characters.", "weak_password");
  }
  const salt = randomHex(16);
  return {
    hash: await derivePasswordHash(cleanPassword, salt),
    salt,
    algorithm: PASSWORD_ALGORITHM,
  };
}

export async function verifyPassword(password, user) {
  if (!user || user.password_algorithm !== PASSWORD_ALGORITHM) {
    return false;
  }
  const candidate = await derivePasswordHash(String(password || ""), user.password_salt);
  return timingSafeEqualHex(candidate, user.password_hash);
}

export function parseCookies(header = "") {
  const cookies = new Map();
  for (const part of String(header || "").split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (!rawKey) {
      continue;
    }
    cookies.set(rawKey, rawValue.join("="));
  }
  return cookies;
}

export function publicUser(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    email: row.email,
    display_name: row.display_name,
    created_at: row.created_at,
  };
}

function cookieSecuritySuffix(request) {
  return new URL(request.url).protocol === "https:" ? "; Secure" : "";
}

export function sessionCookie(token, request) {
  return `${ACCOUNT_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${cookieSecuritySuffix(request)}`;
}

export function clearSessionCookie(request) {
  return `${ACCOUNT_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${cookieSecuritySuffix(request)}`;
}

async function createSession(env, userId, userAgent = "") {
  const db = requireDb(env);
  const token = randomHex(32);
  const tokenHash = await sha256Hex(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000).toISOString();
  await db
    .prepare(
      `INSERT INTO account_sessions (id, user_id, token_hash, user_agent, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(crypto.randomUUID(), userId, tokenHash, String(userAgent || "").slice(0, 255), now.toISOString(), expiresAt)
    .run();
  return { token, expires_at: expiresAt };
}

export async function getSessionUser(request, env) {
  if (!env?.DB) {
    return null;
  }
  const token = parseCookies(request.headers.get("cookie")).get(ACCOUNT_COOKIE);
  if (!token) {
    return null;
  }
  const tokenHash = await sha256Hex(token);
  const row = await env.DB
    .prepare(
      `SELECT u.id, u.email, u.display_name, u.created_at
       FROM account_sessions s
       JOIN account_users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .bind(tokenHash, new Date().toISOString())
    .first();
  return publicUser(row);
}

export async function registerAccount(request, env, payload) {
  const db = requireDb(env);
  const email = normalizeEmail(payload.email);
  if (!validateEmail(email)) {
    throw new AuthError(400, "A valid email address is required.", "invalid_email");
  }
  const passwordRecord = await createPasswordRecord(payload.password);
  const now = new Date().toISOString();
  const user = {
    id: crypto.randomUUID(),
    email,
    display_name: sanitizeDisplayName(payload.display_name, email),
    created_at: now,
  };
  try {
    await db
      .prepare(
        `INSERT INTO account_users
          (id, email, display_name, password_hash, password_salt, password_algorithm, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        user.id,
        user.email,
        user.display_name,
        passwordRecord.hash,
        passwordRecord.salt,
        passwordRecord.algorithm,
        now,
        now,
      )
      .run();
  } catch (error) {
    if (String(error?.message || "").toLowerCase().includes("unique")) {
      throw new AuthError(409, "This email is already registered.", "email_exists");
    }
    throw error;
  }
  const session = await createSession(env, user.id, request.headers.get("user-agent"));
  return { user, session };
}

export async function loginAccount(request, env, payload) {
  const db = requireDb(env);
  const email = normalizeEmail(payload.email);
  const row = await db
    .prepare(
      `SELECT id, email, display_name, password_hash, password_salt, password_algorithm, created_at
       FROM account_users WHERE email = ?`,
    )
    .bind(email)
    .first();
  if (!row || !(await verifyPassword(payload.password, row))) {
    throw new AuthError(401, "Email or password is incorrect.", "invalid_credentials");
  }
  const session = await createSession(env, row.id, request.headers.get("user-agent"));
  return { user: publicUser(row), session };
}

export async function logoutAccount(request, env) {
  if (!env?.DB) {
    return;
  }
  const token = parseCookies(request.headers.get("cookie")).get(ACCOUNT_COOKIE);
  if (!token) {
    return;
  }
  await env.DB.prepare("DELETE FROM account_sessions WHERE token_hash = ?").bind(await sha256Hex(token)).run();
}

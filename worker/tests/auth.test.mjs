import assert from "node:assert/strict";

import {
  ACCOUNT_COOKIE,
  createPasswordRecord,
  normalizeEmail,
  parseCookies,
  sanitizeDisplayName,
  sessionCookie,
  validateEmail,
  verifyPassword,
} from "../auth.js";

assert.equal(normalizeEmail("  USER@Example.COM "), "user@example.com");
assert.equal(validateEmail("user@example.com"), true);
assert.equal(validateEmail("not-an-email"), false);
assert.equal(sanitizeDisplayName("", "user@example.com"), "user");

const passwordRecord = await createPasswordRecord("correct horse battery staple");
assert.equal(passwordRecord.algorithm, "pbkdf2-sha256-10000");
assert.equal(await verifyPassword("correct horse battery staple", {
  password_hash: passwordRecord.hash,
  password_salt: passwordRecord.salt,
  password_algorithm: passwordRecord.algorithm,
}), true);
assert.equal(await verifyPassword("wrong password", {
  password_hash: passwordRecord.hash,
  password_salt: passwordRecord.salt,
  password_algorithm: passwordRecord.algorithm,
}), false);

const request = new Request("https://lingyuetools.org/");
const cookie = sessionCookie("abc123", request);
assert.equal(cookie.includes(`${ACCOUNT_COOKIE}=abc123`), true);
assert.equal(cookie.includes("HttpOnly"), true);
assert.equal(cookie.includes("Secure"), true);

const parsed = parseCookies("theme=light; lt_session=abc123; other=value");
assert.equal(parsed.get(ACCOUNT_COOKIE), "abc123");

console.log("auth tests passed");

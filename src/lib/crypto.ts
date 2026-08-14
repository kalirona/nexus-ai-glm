import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

/**
 * AES-256-GCM encryption for API keys at rest.
 *
 * The encryption key is derived from ENCRYPTION_KEY env var via scrypt.
 *
 * SECURITY:
 *   - In production (NODE_ENV=production or AUTH_MODE=clerk), ENCRYPTION_KEY MUST be set.
 *   - If missing in production: throws fatal error (fail closed).
 *   - In development: uses documented fallback with console warning.
 *   - Each ciphertext stores: iv(12) + authTag(16) + ciphertext, base64-encoded.
 */

const ALGO = "aes-256-gcm";
const IV_LEN = 12;

const DEV_FALLBACK_KEY = "nexusai-dev-encryption-key-change-in-production";

function isProduction(): boolean {
  // Consider production if NODE_ENV is production OR AUTH_MODE is logto
  // (but only if Logto is actually configured)
  if (process.env.NODE_ENV === "production") return true;
  if (process.env.AUTH_MODE === "logto") {
    // Only treat as production if Logto env vars are actually set
    return !!(
      process.env.LOGTO_ENDPOINT &&
      process.env.LOGTO_APP_ID &&
      process.env.LOGTO_APP_SECRET &&
      process.env.LOGTO_COOKIE_SECRET
    );
  }
  return false;
}

function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY;

  if (!secret) {
    if (isProduction()) {
      // FAIL CLOSED — production must never use the dev fallback key
      throw new Error(
        "FATAL: ENCRYPTION_KEY environment variable is not set. " +
          "Generate with: openssl rand -hex 32 — then set in .env"
      );
    }
    // Development only — use documented fallback
    console.warn(
      "⚠️  ENCRYPTION_KEY not set — using development fallback key. " +
        "DO NOT use in production. Set ENCRYPTION_KEY env var."
    );
    return scryptSync(DEV_FALLBACK_KEY, "nexusai-salt", 32);
  }

  return scryptSync(secret, "nexusai-salt", 32);
}

/** Encrypts a plaintext string. Returns base64(iv + authTag + ciphertext). */
export function encrypt(plaintext: string): string {
  if (!plaintext) return "";
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

/** Decrypts a base64(iv + authTag + ciphertext) string. Returns plaintext. */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) return "";
  try {
    const key = getEncryptionKey();
    const data = Buffer.from(ciphertext, "base64");
    const iv = data.subarray(0, IV_LEN);
    const authTag = data.subarray(IV_LEN, IV_LEN + 16);
    const encrypted = data.subarray(IV_LEN + 16);
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

/** Masks a key for display: first 4 + •••• + last 4. */
export function maskKey(key: string): string {
  if (!key || key.length <= 10) return "••••••••";
  return key.slice(0, 4) + "••••••••" + key.slice(-4);
}

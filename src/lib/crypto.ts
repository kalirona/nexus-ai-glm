import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

/**
 * AES-256-GCM encryption for API keys at rest.
 *
 * The encryption key is derived from ENCRYPTION_KEY env var via scrypt.
 * If no env key is set, a stable fallback is used (dev only — warn in logs).
 * Each ciphertext stores: iv(12) + authTag(16) + ciphertext, base64-encoded.
 */

const ALGO = "aes-256-gcm";
const IV_LEN = 12;

function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || "nexusai-dev-encryption-key-change-in-production";
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
    // If decryption fails (wrong key, corrupted data), return empty
    return "";
  }
}

/** Masks a key for display: first 4 + •••• + last 4. */
export function maskKey(key: string): string {
  if (!key || key.length <= 10) return "••••••••";
  return key.slice(0, 4) + "••••••••" + key.slice(-4);
}

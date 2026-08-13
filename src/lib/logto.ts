import "server-only";
import LogtoClient from "@logto/next/edge";

/**
 * Logto Client — singleton instance for the NexusAI application.
 *
 * Uses the edge export which supports App Router's Request/Response objects.
 *
 * SECURITY:
 *   - Server-only module (import "server-only" prevents client bundling)
 *   - LOGTO_APP_SECRET is a server-side env var (no NEXT_PUBLIC_ prefix)
 *   - LOGTO_COOKIE_SECRET is a server-side env var
 *   - The browser never sees the app secret or cookie secret
 *
 * CONFIGURATION:
 *   Required env vars:
 *     LOGTO_ENDPOINT      — Logto server URL (e.g., https://logto.yourdomain.com)
 *     LOGTO_APP_ID        — Logto application ID
 *     LOGTO_APP_SECRET    — Logto application secret (server-side only)
 *     LOGTO_BASE_URL      — NexusAI base URL (e.g., https://nexusai.yourdomain.com)
 *     LOGTO_COOKIE_SECRET — Cookie encryption secret (generate: openssl rand -hex 32)
 */

const LOGTO_ENDPOINT = process.env.LOGTO_ENDPOINT || "";
const LOGTO_APP_ID = process.env.LOGTO_APP_ID || "";
const LOGTO_APP_SECRET = process.env.LOGTO_APP_SECRET || "";
const LOGTO_BASE_URL = process.env.LOGTO_BASE_URL || "http://localhost:3000";
const LOGTO_COOKIE_SECRET = process.env.LOGTO_COOKIE_SECRET || "";

let client: LogtoClient | null = null;

/** Returns true if all required Logto env vars are set. */
export function isLogtoConfigured(): boolean {
  return !!(LOGTO_ENDPOINT && LOGTO_APP_ID && LOGTO_APP_SECRET && LOGTO_COOKIE_SECRET);
}

/** Gets the singleton LogtoClient instance. Returns null if not configured. */
export function getLogtoClient(): LogtoClient | null {
  if (!isLogtoConfigured()) return null;

  if (!client) {
    client = new LogtoClient({
      endpoint: LOGTO_ENDPOINT,
      appId: LOGTO_APP_ID,
      appSecret: LOGTO_APP_SECRET,
      baseUrl: LOGTO_BASE_URL,
      cookieSecret: LOGTO_COOKIE_SECRET,
      cookieSecure: process.env.NODE_ENV === "production",
    });
  }

  return client;
}

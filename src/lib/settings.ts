import { db } from "@/lib/db";

/**
 * Platform-wide settings store (key-value, JSON-encoded values).
 * Managed by super admins. Cached in-memory for the request lifetime.
 */

const cache = new Map<string, unknown>();

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  if (cache.has(key)) return cache.get(key) as T;
  const row = await db.platformSetting.findUnique({ where: { key } });
  if (!row) {
    cache.set(key, fallback);
    return fallback;
  }
  try {
    const parsed = JSON.parse(row.value) as T;
    cache.set(key, parsed);
    return parsed;
  } catch {
    cache.set(key, fallback);
    return fallback;
  }
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  const json = JSON.stringify(value);
  await db.platformSetting.upsert({
    where: { key },
    update: { value: json },
    create: { key, value: json },
  });
  cache.set(key, value);
}

/** Default platform settings. */
export const DEFAULT_SETTINGS = {
  // AI provider
  providerKey: "", // saved API key (masked in UI)
  providerKeyMasked: "",
  enabledModels: ["auto", "glm-4.6", "glm-4.5", "glm-4.5v", "deepseek-v3"],
  // Security
  rateLimitPerMin: 60,
  rateLimitPerDay: 5000,
  ipAllowlist: "" as string, // comma-separated
  requireEmailVerification: true,
  autoSuspendAbuse: true,
  blockProxies: false,
  // Performance
  cacheEnabled: true,
  cacheTtlSeconds: 300,
  maxConcurrentStreams: 50,
  responseTimeoutSeconds: 60,
} as const;

export type PlatformSettings = typeof DEFAULT_SETTINGS;

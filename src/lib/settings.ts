import { db } from "@/lib/db";

/**
 * Platform-wide settings store (key-value, JSON-encoded values).
 * Managed by super admins. Reads directly from the DB on every call to
 * guarantee consistency across routes (Turbopack may isolate module caches).
 */

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.platformSetting.findUnique({ where: { key } });
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
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
}

/** A custom (admin-defined) model with its own endpoint + key. */
export interface CustomModel {
  id: string;
  name: string; // display name
  modelId: string; // the model ID sent to the provider
  baseUrl: string; // provider base URL
  apiKey: string; // masked when returned
  apiKeyMasked: string;
  provider: string; // provider id (zai, openrouter, openai, custom, …)
  description?: string;
  context?: string;
  enabled: boolean;
}

/** Default platform settings. */
export const DEFAULT_SETTINGS = {
  // AI provider
  providerId: "zai", // selected provider (zai | openrouter | openai | deepseek | groq | custom)
  providerKey: "", // saved API key for the selected provider (masked in UI)
  providerKeyMasked: "",
  baseUrl: "https://api.z.ai/api/paas/v4", // AI provider base URL
  enabledModels: ["auto", "glm-4.6", "glm-4.5", "glm-4.5v", "deepseek-v3"],
  customModels: [] as CustomModel[], // admin-defined models with their own key/url
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
  // System / platform flags
  allowSignups: true,
  maintenanceMode: false,
  costPerChat: 1,
  costPerImage: 8,
  costPerDocument: 5,
} as const;

export type PlatformSettings = typeof DEFAULT_SETTINGS;

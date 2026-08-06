import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";

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

/** Role an API key is assigned to. */
export type KeyRole = "chat" | "image" | "all";

/** A managed API key with a role, provider and base URL. */
export interface ApiKeyConfig {
  id: string;
  label: string; // friendly name, e.g. "Z.ai Chat Key"
  role: KeyRole; // chat | image | all
  provider: string; // provider id (zai, openrouter, openai, …)
  baseUrl: string; // provider base URL
  apiKey: string; // raw key (masked when returned)
  apiKeyMasked: string;
  isDefault: boolean; // default key for the role
  createdAt: string;
}

/** Default platform settings. */
export const DEFAULT_SETTINGS = {
  // AI provider
  providerId: "zai", // selected provider (zai | openrouter | openai | deepseek | groq | custom)
  providerKey: "", // saved API key for the selected provider (masked in UI) — legacy
  providerKeyMasked: "",
  baseUrl: "https://api.z.ai/api/paas/v4", // AI provider base URL
  enabledModels: ["auto", "glm-4.6", "glm-4.5", "glm-4.5v", "deepseek-v3"],
  customModels: [] as CustomModel[], // admin-defined models with their own key/url
  apiKeys: [] as ApiKeyConfig[], // managed API keys with role assignment
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
  // AI Infrastructure Center
  defaultModels: {} as Record<string, string>, // use case id → model id (chat, reasoning, coding, …)
  routingRules: {} as Record<string, { primary: string; fallback: string }>, // use case → { primary, fallback }
  aiLimits: {
    monthlyBudget: 500,
    dailyBudget: 25,
    maxTokensPerRequest: 128000,
    maxRequestsPerDay: 10000,
    maxConcurrentRequests: 50,
    perUserDailyLimit: 500,
    perProjectDailyLimit: 2000,
    perAgentDailyLimit: 1000,
  },
  defaultModel: "" as string, // global default chat model id (starred in Models tab)
} as const;

export type PlatformSettings = typeof DEFAULT_SETTINGS;

/**
 * Resolves the API key + base URL for a given role (chat or image).
 * Priority: default apiKeys entry for the role → legacy providerKey → null.
 * Returns null if no key is configured (caller falls back to SDK).
 * Keys are stored encrypted — decrypted here before returning.
 */
export async function resolveKeyForRole(
  role: "chat" | "image"
): Promise<{ apiKey: string; baseUrl: string } | null> {
  const apiKeys = await getSetting<ApiKeyConfig[]>("apiKeys", []);
  // Find a default key that covers this role (apiKey field is encrypted)
  const match =
    apiKeys.find((k) => k.isDefault && (k.role === "all" || k.role === role) && k.apiKey) ||
    apiKeys.find((k) => (k.role === "all" || k.role === role) && k.apiKey);
  if (match) {
    const decryptedKey = decrypt(match.apiKey);
    if (decryptedKey) {
      return { apiKey: decryptedKey, baseUrl: match.baseUrl };
    }
    // If decrypt fails (e.g. old plaintext key), try using it directly
    if (match.apiKey.length > 10) {
      return { apiKey: match.apiKey, baseUrl: match.baseUrl };
    }
  }
  // Fall back to legacy providerKey (also encrypted)
  const legacyKeyRaw = await getSetting<string>("providerKey", "");
  const legacyKey = decrypt(legacyKeyRaw) || legacyKeyRaw; // try decrypt, fall back to plaintext
  const legacyBaseUrl = await getSetting<string>("baseUrl", DEFAULT_SETTINGS.baseUrl);
  if (legacyKey) return { apiKey: legacyKey, baseUrl: legacyBaseUrl };
  return null;
}

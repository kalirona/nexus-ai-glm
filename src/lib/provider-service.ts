import { AI_PROVIDERS, type ProviderDef } from "@/lib/constants";
import { getSetting } from "@/lib/settings";
import { decrypt, maskKey } from "@/lib/crypto";
import { db } from "@/lib/db";

/**
 * AI Provider Service — handles live model fetching, connection testing,
 * and auth header construction for all supported providers.
 */

export interface ConfiguredProvider {
  id: string;
  name: string;
  providerType: string;
  description: string;
  baseUrl: string;
  docsUrl: string;
  status: "active" | "inactive" | "unconfigured";
  apiKeyMasked: string;
  hasKey: boolean;
  capabilities: ProviderDef["capabilities"];
  authScheme: string;
  modelsEndpoint: string;
  lastTestedAt?: string;
  lastTestSuccess?: boolean;
  lastTestLatencyMs?: number;
  lastTestError?: string;
  orgId?: string;
  projectId?: string;
  region?: string;
  timeout?: number;
  retryCount?: number;
}

/** Loads all providers with their configured state from settings. */
export async function getConfiguredProviders(): Promise<ConfiguredProvider[]> {
  const providerConfigs = await getSetting<Record<string, {
    apiKeyMasked?: string;
    lastTestedAt?: string;
    lastTestSuccess?: boolean;
    lastTestLatencyMs?: number;
    lastTestError?: string;
    orgId?: string;
    projectId?: string;
    region?: string;
    timeout?: number;
    retryCount?: number;
    active?: boolean;
  }>>("providerConfigs", {});

  const apiKeys = await getSetting<Array<{ id: string; provider: string; apiKeyMasked: string; isDefault: boolean }>>("apiKeys", []);

  return AI_PROVIDERS.map((def) => {
    const config = providerConfigs[def.id] ?? {};
    // Check if there's an API key for this provider
    const keyEntry = apiKeys.find((k) => k.provider === def.id);
    const hasKey = !!(keyEntry?.apiKeyMasked) || def.authScheme === "none";

    return {
      id: def.id,
      name: def.name,
      providerType: def.id,
      description: def.description,
      baseUrl: def.baseUrl,
      docsUrl: def.docsUrl,
      status: config.active === false ? "inactive" : hasKey ? "active" : "unconfigured",
      apiKeyMasked: keyEntry?.apiKeyMasked ?? "",
      hasKey,
      capabilities: def.capabilities,
      authScheme: def.authScheme,
      modelsEndpoint: def.modelsEndpoint,
      lastTestedAt: config.lastTestedAt,
      lastTestSuccess: config.lastTestSuccess,
      lastTestLatencyMs: config.lastTestLatencyMs,
      lastTestError: config.lastTestError,
      orgId: config.orgId,
      projectId: config.projectId,
      region: config.region,
      timeout: config.timeout,
      retryCount: config.retryCount,
    };
  });
}

/** Gets the decrypted API key for a provider. */
export async function getProviderKey(providerId: string): Promise<string> {
  const apiKeys = await getSetting<Array<{
    id: string;
    provider: string;
    apiKey: string;
    apiKeyMasked: string;
    isDefault: boolean;
  }>>("apiKeys", []);

  // The apiKey field is encrypted at rest — decrypt it
  const keyEntry = apiKeys.find((k) => k.provider === providerId && k.isDefault) ||
    apiKeys.find((k) => k.provider === providerId);
  if (!keyEntry?.apiKey) return "";
  return decrypt(keyEntry.apiKey);
}

/** Builds auth headers for a provider based on its auth scheme. */
export function buildAuthHeaders(provider: ProviderDef, apiKey: string): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  switch (provider.authScheme) {
    case "bearer":
      if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
      break;
    case "x-api-key":
      if (apiKey) headers["x-api-key"] = apiKey;
      // Anthropic also requires an API version header
      if (provider.id === "anthropic") headers["anthropic-version"] = "2023-06-01";
      break;
    case "none":
      break;
    // "query" scheme handled in URL construction
  }
  return headers;
}

/** Builds the full URL for a provider endpoint, handling query-scheme auth. */
export function buildUrl(provider: ProviderDef, baseUrl: string, path: string, apiKey?: string): string {
  const base = baseUrl.replace(/\/$/, "");
  if (provider.authScheme === "query" && apiKey) {
    const sep = path.includes("?") ? "&" : "?";
    return `${base}${path}${sep}key=${apiKey}`;
  }
  return `${base}${path}`;
}

export interface LiveModel {
  id: string;
  name: string;
  provider: string;
  contextWindow?: number;
  inputCost?: number;
  outputCost?: number;
  capabilities?: {
    vision?: boolean;
    functionCalling?: boolean;
    reasoning?: boolean;
    streaming?: boolean;
  };
}

/**
 * Fetches the live model list from a provider's API.
 * Only works for providers with a modelsEndpoint.
 */
export async function fetchProviderModels(providerId: string): Promise<{ models: LiveModel[]; error?: string }> {
  const provider = AI_PROVIDERS.find((p) => p.id === providerId);
  if (!provider) return { models: [], error: "Unknown provider" };
  if (!provider.modelsEndpoint) {
    return { models: [], error: "This provider does not support live model listing. Add models manually." };
  }

  const apiKey = await getProviderKey(providerId);
  if (provider.authScheme !== "none" && !apiKey) {
    return { models: [], error: "No API key configured for this provider" };
  }

  const baseUrl = provider.baseUrl;
  const url = buildUrl(provider, baseUrl, provider.modelsEndpoint, apiKey);
  const headers = buildAuthHeaders(provider, apiKey);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      let msg = `HTTP ${res.status}`;
      try {
        const errJson = JSON.parse(errText);
        msg = errJson?.error?.message?.slice(0, 120) || errJson?.message?.slice(0, 120) || msg;
      } catch {
        if (errText) msg += `: ${errText.slice(0, 80)}`;
      }
      return { models: [], error: msg };
    }

    const data = await res.json();
    const rawModels = (data as { data?: unknown[]; models?: unknown[] }).data || (data as { models?: unknown[] }).models || [];

    const models: LiveModel[] = (rawModels as Array<Record<string, unknown>>).map((m) => {
      const id = (m.id as string) || (m.name as string) || "unknown";
      const name = (m.name as string) || id;
      // Some providers include context/cost info in the model object
      const contextWindow = (m.context_length as number) || (m.max_tokens as number) || undefined;
      const pricing = m.pricing as { prompt?: string; completion?: string } | undefined;
      const inputCost = pricing?.prompt ? parseFloat(pricing.prompt) * 1_000_000 : undefined;
      const outputCost = pricing?.completion ? parseFloat(pricing.completion) * 1_000_000 : undefined;
      const architecture = m.architecture as { input_modalities?: string[] } | undefined;
      const vision = architecture?.input_modalities?.includes("image") ?? false;

      return {
        id,
        name,
        provider: providerId,
        contextWindow,
        inputCost,
        outputCost,
        capabilities: {
          vision,
          functionCalling: true, // most modern models support this
          reasoning: id.includes("r1") || id.includes("o1") || id.includes("o3") || id.includes("reasoning"),
          streaming: provider.capabilities.streaming,
        },
      };
    });

    return { models };
  } catch (err) {
    return {
      models: [],
      error: err instanceof Error ? err.message.slice(0, 120) : "Network error",
    };
  }
}

export interface TestConnectionResult {
  success: boolean;
  latencyMs: number;
  modelCount: number;
  error?: string;
  providerVersion?: string;
}

/**
 * Tests the connection to a provider by fetching its model list.
 * Records the test result in providerConfigs.
 */
export async function testProviderConnection(providerId: string): Promise<TestConnectionResult> {
  const provider = AI_PROVIDERS.find((p) => p.id === providerId);
  if (!provider) return { success: false, latencyMs: 0, modelCount: 0, error: "Unknown provider" };

  const start = Date.now();
  const { models, error } = await fetchProviderModels(providerId);
  const latencyMs = Date.now() - start;

  // Save the test result
  const providerConfigs = await getSetting<Record<string, Record<string, unknown>>>("providerConfigs", {});
  providerConfigs[providerId] = {
    ...providerConfigs[providerId],
    lastTestedAt: new Date().toISOString(),
    lastTestSuccess: !error,
    lastTestLatencyMs: latencyMs,
    lastTestError: error ?? null,
  };
  await db.platformSetting.upsert({
    where: { key: "providerConfigs" },
    update: { value: JSON.stringify(providerConfigs) },
    create: { key: "providerConfigs", value: JSON.stringify(providerConfigs) },
  });

  return {
    success: !error,
    latencyMs,
    modelCount: models.length,
    error,
  };
}

/** Logs an AI usage event. */
export async function logAiUsage(params: {
  userId?: string;
  provider: string;
  model: string;
  requestType: "chat" | "image" | "document" | "embedding";
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cost?: number;
  durationMs?: number;
  success?: boolean;
  errorMessage?: string;
  streaming?: boolean;
}): Promise<void> {
  try {
    await db.aiUsageLog.create({
      data: {
        userId: params.userId ?? null,
        provider: params.provider,
        model: params.model,
        requestType: params.requestType,
        promptTokens: params.promptTokens ?? 0,
        completionTokens: params.completionTokens ?? 0,
        totalTokens: params.totalTokens ?? 0,
        cost: params.cost ?? 0,
        durationMs: params.durationMs ?? 0,
        success: params.success ?? true,
        errorMessage: params.errorMessage ?? null,
        streaming: params.streaming ?? false,
      },
    });
  } catch {
    // Don't let logging failures break the AI request
  }
}

import { AI_PROVIDERS, type ProviderDef } from "@/lib/constants";
import { getSetting, type ApiKeyConfig } from "@/lib/settings";
import { decrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { buildAuthHeaders, buildUrl } from "@/lib/provider-service";

/**
 * AI Gateway Sync Engine
 *
 * Fetches live model catalogs from provider APIs, persists them to the AiModel
 * table with three-layer state (catalog → verified → approved), and generates
 * synchronization reports.
 *
 * Never uses hardcoded lists. Always communicates with the real provider API.
 */

export interface SyncReport {
  providerId: string;
  providerName: string;
  catalogModels: number;
  verified: number;
  approved: number;
  newModels: number;
  updatedModels: number;
  unavailable: number;
  deprecated: number;
  removed: number;
  duration: number;
  error?: string;
}

export interface AiModelDto {
  id: string;
  providerId: string;
  modelId: string;
  displayName: string;
  providerName: string;
  owner: string | null;
  category: string | null;
  contextWindow: number | null;
  maxOutputTokens: number | null;
  inputCostPerM: number | null;
  outputCostPerM: number | null;
  supportsStreaming: boolean;
  supportsVision: boolean;
  supportsFunctionCalling: boolean;
  supportsJsonMode: boolean;
  supportsEmbeddings: boolean;
  supportsAudio: boolean;
  supportsImages: boolean;
  supportsVideo: boolean;
  supportsReasoning: boolean;
  verificationStatus: string;
  enabled: boolean;
  approved: boolean;
  isDefault: boolean;
  defaultCapability: string | null;
  healthStatus: string;
  avgLatencyMs: number | null;
  lastHealthCheck: string | null;
  lastSyncAt: string | null;
  lastVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Raw model as returned by a provider's API. */
interface RawProviderModel {
  id: string;
  name?: string;
  context_length?: number;
  max_tokens?: number;
  pricing?: { prompt?: string; completion?: string };
  architecture?: { input_modalities?: string[]; output_modalities?: string[]; modality?: string };
  top_provider?: { max_completion_tokens?: number };
  description?: string;
  owned_by?: string;
}

/**
 * Synchronizes models for a single provider.
 * 1. Validates credentials
 * 2. Connects to provider API
 * 3. Fetches catalog
 * 4. Compares with DB
 * 5. Adds new, updates existing, marks missing as unavailable
 * 6. Generates sync report
 */
export async function syncProviderModels(providerId: string): Promise<SyncReport> {
  const provider = AI_PROVIDERS.find((p) => p.id === providerId);
  const start = Date.now();

  if (!provider) {
    return {
      providerId, providerName: "Unknown", catalogModels: 0, verified: 0, approved: 0,
      newModels: 0, updatedModels: 0, unavailable: 0, deprecated: 0, removed: 0,
      duration: Date.now() - start, error: "Unknown provider",
    };
  }

  if (!provider.modelsEndpoint) {
    return {
      providerId, providerName: provider.name, catalogModels: 0, verified: 0, approved: 0,
      newModels: 0, updatedModels: 0, unavailable: 0, deprecated: 0, removed: 0,
      duration: Date.now() - start, error: "Provider does not support live model listing",
    };
  }

  // Get the decrypted API key
  const apiKey = await getProviderKey(providerId);
  if (provider.authScheme !== "none" && !apiKey) {
    return {
      providerId, providerName: provider.name, catalogModels: 0, verified: 0, approved: 0,
      newModels: 0, updatedModels: 0, unavailable: 0, deprecated: 0, removed: 0,
      duration: Date.now() - start, error: "No API key configured for this provider",
    };
  }

  // Fetch the live catalog
  const url = buildUrl(provider, provider.baseUrl, provider.modelsEndpoint, apiKey);
  const headers = buildAuthHeaders(provider, apiKey);

  let rawModels: RawProviderModel[] = [];
  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      let msg = `HTTP ${res.status}`;
      try {
        const errJson = JSON.parse(errText);
        msg = errJson?.error?.message?.slice(0, 150) || errJson?.message?.slice(0, 150) || msg;
      } catch {
        if (errText) msg += `: ${errText.slice(0, 80)}`;
      }
      return {
        providerId, providerName: provider.name, catalogModels: 0, verified: 0, approved: 0,
        newModels: 0, updatedModels: 0, unavailable: 0, deprecated: 0, removed: 0,
        duration: Date.now() - start, error: msg,
      };
    }

    const data = await res.json();
    rawModels = (data as { data?: RawProviderModel[]; models?: RawProviderModel[] }).data
      || (data as { models?: RawProviderModel[] }).models
      || [];
  } catch (err) {
    return {
      providerId, providerName: provider.name, catalogModels: 0, verified: 0, approved: 0,
      newModels: 0, updatedModels: 0, unavailable: 0, deprecated: 0, removed: 0,
      duration: Date.now() - start, error: err instanceof Error ? err.message.slice(0, 150) : "Network error",
    };
  }

  // Get existing models from DB for this provider
  const existing = await db.aiModel.findMany({ where: { providerId } });
  const existingMap = new Map(existing.map((m) => [m.modelId, m]));
  const now = new Date();
  const catalogIds = new Set(rawModels.map((m) => m.id));

  let newModels = 0;
  let updatedModels = 0;
  let unavailable = 0;
  let deprecated = 0;
  let removed = 0;

  // Process each catalog model
  for (const raw of rawModels) {
    const modelId = raw.id || raw.name || "unknown";
    const displayName = raw.name || modelId;
    const contextWindow = raw.context_length || raw.max_tokens || null;
    const pricing = raw.pricing;
    const inputCostPerM = pricing?.prompt ? parseFloat(pricing.prompt) * 1_000_000 : null;
    const outputCostPerM = pricing?.completion ? parseFloat(pricing.completion) * 1_000_000 : null;
    const maxOutputTokens = raw.top_provider?.max_completion_tokens || null;
    const architecture = raw.architecture;
    const vision = architecture?.input_modalities?.includes("image") ?? false;
    const audio = architecture?.input_modalities?.includes("audio") ?? false;
    const supportsImages = architecture?.modality === "image" || (architecture?.output_modalities?.includes("image") ?? false);
    const owner = raw.owned_by || null;
    const isDeprecated = raw.id?.includes("deprecated") || raw.description?.toLowerCase().includes("deprecated") || false;

    // Detect category
    const category = detectCategory(modelId, supportsImages, architecture?.modality);

    // Detect reasoning
    const supportsReasoning = modelId.includes("r1") || modelId.includes("o1") || modelId.includes("o3") || modelId.includes("reasoning");

    const existingModel = existingMap.get(modelId);
    if (existingModel) {
      // Update existing model
      const wasUnavailable = existingModel.verificationStatus === "unavailable";
      const updates: Record<string, unknown> = {
        displayName,
        contextWindow,
        maxOutputTokens,
        inputCostPerM,
        outputCostPerM,
        supportsVision: vision,
        supportsAudio: audio,
        supportsImages,
        supportsReasoning,
        supportsStreaming: provider.capabilities.streaming,
        supportsFunctionCalling: provider.capabilities.functionCalling,
        supportsEmbeddings: provider.capabilities.embedding,
        owner,
        category,
        lastSyncAt: now,
      };

      // If it was unavailable but is back in the catalog, restore it
      if (wasUnavailable) {
        updates.verificationStatus = "unverified";
        updates.healthStatus = "unknown";
      }

      // Check if any field actually changed
      const hasChanges =
        existingModel.displayName !== displayName ||
        existingModel.contextWindow !== contextWindow ||
        existingModel.inputCostPerM !== inputCostPerM ||
        existingModel.outputCostPerM !== outputCostPerM ||
        existingModel.supportsVision !== vision ||
        wasUnavailable;

      if (hasChanges) {
        await db.aiModel.update({ where: { id: existingModel.id }, data: updates });
        updatedModels++;
      }
    } else {
      // Create new model
      await db.aiModel.create({
        data: {
          providerId,
          modelId,
          displayName,
          providerName: provider.name,
          owner,
          category,
          contextWindow,
          maxOutputTokens,
          inputCostPerM,
          outputCostPerM,
          supportsStreaming: provider.capabilities.streaming,
          supportsVision: vision,
          supportsFunctionCalling: provider.capabilities.functionCalling,
          supportsJsonMode: false,
          supportsEmbeddings: provider.capabilities.embedding,
          supportsAudio: audio,
          supportsImages,
          supportsVideo: provider.capabilities.video,
          supportsReasoning,
          verificationStatus: "unverified",
          enabled: true,
          approved: false,
          isDefault: false,
          healthStatus: "unknown",
          lastSyncAt: now,
        },
      });
      newModels++;
    }

    if (isDeprecated) deprecated++;
  }

  // Mark models that are no longer in the catalog as unavailable
  for (const existingModel of existing) {
    if (!catalogIds.has(existingModel.modelId) && existingModel.verificationStatus !== "unavailable") {
      await db.aiModel.update({
        where: { id: existingModel.id },
        data: {
          verificationStatus: "unavailable",
          healthStatus: "offline",
          lastSyncAt: now,
        },
      });
      removed++;
      unavailable++;
    }
  }

  // Count verified + approved
  const allModels = await db.aiModel.findMany({ where: { providerId } });
  const verified = allModels.filter((m) => m.verificationStatus === "verified").length;
  const approved = allModels.filter((m) => m.approved).length;

  return {
    providerId,
    providerName: provider.name,
    catalogModels: rawModels.length,
    verified,
    approved,
    newModels,
    updatedModels,
    unavailable,
    deprecated,
    removed,
    duration: Date.now() - start,
  };
}

/**
 * Verifies a single model by sending a lightweight completion request.
 * Updates the model's verificationStatus and healthStatus.
 */
export async function verifyModel(modelDbId: string): Promise<{ verified: boolean; latencyMs: number; error?: string }> {
  const model = await db.aiModel.findUnique({ where: { id: modelDbId } });
  if (!model) return { verified: false, latencyMs: 0, error: "Model not found" };

  const provider = AI_PROVIDERS.find((p) => p.id === model.providerId);
  if (!provider) return { verified: false, latencyMs: 0, error: "Unknown provider" };

  const apiKey = await getProviderKey(model.providerId);
  if (provider.authScheme !== "none" && !apiKey) {
    return { verified: false, latencyMs: 0, error: "No API key configured" };
  }

  const url = buildUrl(provider, provider.baseUrl, "/chat/completions", apiKey);
  const headers = buildAuthHeaders(provider, apiKey);
  const start = Date.now();

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: model.modelId,
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 5,
        thinking: { type: "disabled" },
      }),
      signal: AbortSignal.timeout(20000),
    });

    const latencyMs = Date.now() - start;

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const hasChoices = Array.isArray((data as { choices?: unknown[] }).choices);
      if (hasChoices) {
        // Determine health from latency
        const healthStatus = latencyMs < 2000 ? "healthy" : latencyMs < 5000 ? "slow" : "degraded";
        await db.aiModel.update({
          where: { id: modelDbId },
          data: {
            verificationStatus: "verified",
            healthStatus,
            avgLatencyMs: latencyMs,
            lastVerifiedAt: new Date(),
            lastHealthCheck: new Date(),
          },
        });
        return { verified: true, latencyMs };
      }
      // 200 but no choices — might be a non-chat model
      await db.aiModel.update({
        where: { id: modelDbId },
        data: { verificationStatus: "verified", healthStatus: "healthy", lastVerifiedAt: new Date(), lastHealthCheck: new Date() },
      });
      return { verified: true, latencyMs };
    } else if (res.status === 401 || res.status === 403) {
      await db.aiModel.update({
        where: { id: modelDbId },
        data: { verificationStatus: "unavailable", healthStatus: "offline", lastHealthCheck: new Date() },
      });
      return { verified: false, latencyMs, error: "Invalid API key (401)" };
    } else {
      const errText = await res.text().catch(() => "");
      let msg = `HTTP ${res.status}`;
      try {
        const errJson = JSON.parse(errText);
        msg = errJson?.error?.message?.slice(0, 120) || errJson?.message?.slice(0, 120) || msg;
      } catch { /* ignore */ }
      // Some models may not support the chat endpoint — mark as unverified but not offline
      await db.aiModel.update({
        where: { id: modelDbId },
        data: { healthStatus: "degraded", lastHealthCheck: new Date() },
      });
      return { verified: false, latencyMs, error: msg };
    }
  } catch (err) {
    const latencyMs = Date.now() - start;
    await db.aiModel.update({
      where: { id: modelDbId },
      data: { healthStatus: "offline", lastHealthCheck: new Date() },
    });
    return { verified: false, latencyMs, error: err instanceof Error ? err.message.slice(0, 120) : "Network error" };
  }
}

/**
 * Gets the decrypted API key for a provider.
 * Handles both encrypted keys (new) and plaintext keys (legacy).
 */
async function getProviderKey(providerId: string): Promise<string> {
  // First check the apiKeys[] array (encrypted at rest)
  const apiKeys = await getSetting<ApiKeyConfig[]>("apiKeys", []);
  const keyEntry = apiKeys.find((k) => k.provider === providerId && k.isDefault) ||
    apiKeys.find((k) => k.provider === providerId);
  if (keyEntry?.apiKey) {
    const decrypted = decrypt(keyEntry.apiKey);
    if (decrypted) return decrypted;
    // Fallback: old plaintext key
    if (keyEntry.apiKey.length > 10) return keyEntry.apiKey;
  }

  // Fall back to legacy providerKey (may be encrypted or plaintext)
  const legacyKeyRaw = await getSetting<string>("providerKey", "");
  if (legacyKeyRaw) {
    const decrypted = decrypt(legacyKeyRaw);
    if (decrypted) return decrypted;
    // Old plaintext fallback
    if (legacyKeyRaw.length > 10) return legacyKeyRaw;
  }

  return "";
}

/** Detects a model's category from its ID and modality. */
function detectCategory(modelId: string, supportsImages: boolean, modality?: string): string {
  const id = modelId.toLowerCase();
  if (modality === "image" || supportsImages || id.includes("dall-e") || id.includes("flux") || id.includes("stable-diffusion")) return "image";
  if (id.includes("whisper") || id.includes("tts") || id.includes("audio")) return "audio";
  if (id.includes("embed")) return "embedding";
  if (id.includes("video") || id.includes("veo") || id.includes("sora")) return "video";
  if (id.includes("moderation")) return "moderation";
  return "chat";
}

// ---------------------------------------------------------------------------
// ROUTING ENGINE
// ---------------------------------------------------------------------------

/**
 * Resolves the best model for a given capability.
 * Only selects models that are: approved + enabled + verified + healthy.
 * Falls back to the default model for the capability, then any approved model.
 */
export async function resolveModelForCapability(
  capability: string,
  preferredModelId?: string
): Promise<{ providerId: string; modelId: string; apiKey: string; baseUrl: string } | null> {
  // If a preferred model is specified, check if it's usable
  if (preferredModelId && preferredModelId !== "auto") {
    const model = await db.aiModel.findFirst({
      where: {
        modelId: preferredModelId,
        approved: true,
        enabled: true,
        verificationStatus: "verified",
        healthStatus: { in: ["healthy", "slow", "unknown"] },
      },
    });
    if (model) {
      const apiKey = await getProviderKey(model.providerId);
      const provider = AI_PROVIDERS.find((p) => p.id === model.providerId);
      if (provider && apiKey) {
        return { providerId: model.providerId, modelId: model.modelId, apiKey, baseUrl: provider.baseUrl };
      }
    }
  }

  // Try the default model for this capability
  const defaultModel = await db.aiModel.findFirst({
    where: {
      defaultCapability: capability,
      approved: true,
      enabled: true,
      verificationStatus: "verified",
      healthStatus: { in: ["healthy", "slow", "unknown"] },
    },
  });
  if (defaultModel) {
    const apiKey = await getProviderKey(defaultModel.providerId);
    const provider = AI_PROVIDERS.find((p) => p.id === defaultModel.providerId);
    if (provider && apiKey) {
      return { providerId: defaultModel.providerId, modelId: defaultModel.modelId, apiKey, baseUrl: provider.baseUrl };
    }
  }

  // Fall back to any approved+verified model
  const fallback = await db.aiModel.findFirst({
    where: {
      approved: true,
      enabled: true,
      verificationStatus: "verified",
      healthStatus: { in: ["healthy", "slow", "unknown"] },
      category: capability === "chat" ? "chat" : undefined,
    },
    orderBy: [{ isDefault: "desc" }, { avgLatencyMs: "asc" }],
  });
  if (fallback) {
    const apiKey = await getProviderKey(fallback.providerId);
    const provider = AI_PROVIDERS.find((p) => p.id === fallback.providerId);
    if (provider && apiKey) {
      return { providerId: fallback.providerId, modelId: fallback.modelId, apiKey, baseUrl: provider.baseUrl };
    }
  }

  return null;
}

/**
 * Gets all models visible to users — only approved + enabled.
 * This is what the model selector in chat/images/documents shows.
 */
export async function getApprovedModels(): Promise<AiModelDto[]> {
  const models = await db.aiModel.findMany({
    where: { approved: true, enabled: true, verificationStatus: { not: "unavailable" } },
    orderBy: [{ isDefault: "desc" }, { displayName: "asc" }],
  });
  return models.map(toDto);
}

/** Converts a Prisma AiModel to the DTO. */
function toDto(m: {
  id: string; providerId: string; modelId: string; displayName: string; providerName: string;
  owner: string | null; category: string | null; contextWindow: number | null; maxOutputTokens: number | null;
  inputCostPerM: number | null; outputCostPerM: number | null;
  supportsStreaming: boolean; supportsVision: boolean; supportsFunctionCalling: boolean;
  supportsJsonMode: boolean; supportsEmbeddings: boolean; supportsAudio: boolean; supportsImages: boolean;
  supportsVideo: boolean; supportsReasoning: boolean;
  verificationStatus: string; enabled: boolean; approved: boolean; isDefault: boolean; defaultCapability: string | null;
  healthStatus: string; avgLatencyMs: number | null; lastHealthCheck: Date | null;
  lastSyncAt: Date | null; lastVerifiedAt: Date | null;
  createdAt: Date; updatedAt: Date;
}): AiModelDto {
  return {
    id: m.id, providerId: m.providerId, modelId: m.modelId, displayName: m.displayName,
    providerName: m.providerName, owner: m.owner, category: m.category,
    contextWindow: m.contextWindow, maxOutputTokens: m.maxOutputTokens,
    inputCostPerM: m.inputCostPerM, outputCostPerM: m.outputCostPerM,
    supportsStreaming: m.supportsStreaming, supportsVision: m.supportsVision,
    supportsFunctionCalling: m.supportsFunctionCalling, supportsJsonMode: m.supportsJsonMode,
    supportsEmbeddings: m.supportsEmbeddings, supportsAudio: m.supportsAudio,
    supportsImages: m.supportsImages, supportsVideo: m.supportsVideo, supportsReasoning: m.supportsReasoning,
    verificationStatus: m.verificationStatus, enabled: m.enabled, approved: m.approved,
    isDefault: m.isDefault, defaultCapability: m.defaultCapability,
    healthStatus: m.healthStatus, avgLatencyMs: m.avgLatencyMs,
    lastHealthCheck: m.lastHealthCheck?.toISOString() ?? null,
    lastSyncAt: m.lastSyncAt?.toISOString() ?? null,
    lastVerifiedAt: m.lastVerifiedAt?.toISOString() ?? null,
    createdAt: m.createdAt.toISOString(), updatedAt: m.updatedAt.toISOString(),
  };
}

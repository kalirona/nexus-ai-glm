import { NextResponse } from "next/server";
import { requireAdmin, logAudit } from "@/lib/auth";
import { getSetting, setSetting, DEFAULT_SETTINGS, type PlatformSettings, type CustomModel, type ApiKeyConfig } from "@/lib/settings";
import { AI_PROVIDERS } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function maskKey(key: string): string {
  if (key.length <= 10) return "••••••••";
  return key.slice(0, 6) + "••••••••" + key.slice(-4);
}

/** GET /api/admin/settings — full platform settings (admin only). */
export async function GET() {
  await requireAdmin();

  // Load custom models and mask their keys
  const customModelsRaw = await getSetting<CustomModel[]>("customModels", []);
  const customModels = customModelsRaw.map((m) => ({
    ...m,
    apiKey: "", // never return raw keys
  }));

  // Load API keys and mask them
  const apiKeysRaw = await getSetting<ApiKeyConfig[]>("apiKeys", []);
  const apiKeys = apiKeysRaw.map((k) => ({
    ...k,
    apiKey: "", // never return raw keys
  }));

  const settings: PlatformSettings = {
    providerId: await getSetting("providerId", DEFAULT_SETTINGS.providerId),
    providerKey: "", // never return the raw key
    providerKeyMasked: await getSetting("providerKeyMasked", ""),
    baseUrl: await getSetting("baseUrl", DEFAULT_SETTINGS.baseUrl),
    enabledModels: await getSetting("enabledModels", DEFAULT_SETTINGS.enabledModels),
    customModels,
    apiKeys,
    rateLimitPerMin: await getSetting("rateLimitPerMin", DEFAULT_SETTINGS.rateLimitPerMin),
    rateLimitPerDay: await getSetting("rateLimitPerDay", DEFAULT_SETTINGS.rateLimitPerDay),
    ipAllowlist: await getSetting("ipAllowlist", DEFAULT_SETTINGS.ipAllowlist),
    requireEmailVerification: await getSetting("requireEmailVerification", DEFAULT_SETTINGS.requireEmailVerification),
    autoSuspendAbuse: await getSetting("autoSuspendAbuse", DEFAULT_SETTINGS.autoSuspendAbuse),
    blockProxies: await getSetting("blockProxies", DEFAULT_SETTINGS.blockProxies),
    cacheEnabled: await getSetting("cacheEnabled", DEFAULT_SETTINGS.cacheEnabled),
    cacheTtlSeconds: await getSetting("cacheTtlSeconds", DEFAULT_SETTINGS.cacheTtlSeconds),
    maxConcurrentStreams: await getSetting("maxConcurrentStreams", DEFAULT_SETTINGS.maxConcurrentStreams),
    responseTimeoutSeconds: await getSetting("responseTimeoutSeconds", DEFAULT_SETTINGS.responseTimeoutSeconds),
    allowSignups: await getSetting("allowSignups", DEFAULT_SETTINGS.allowSignups),
    maintenanceMode: await getSetting("maintenanceMode", DEFAULT_SETTINGS.maintenanceMode),
    costPerChat: await getSetting("costPerChat", DEFAULT_SETTINGS.costPerChat),
    costPerImage: await getSetting("costPerImage", DEFAULT_SETTINGS.costPerImage),
    costPerDocument: await getSetting("costPerDocument", DEFAULT_SETTINGS.costPerDocument),
    defaultModels: await getSetting("defaultModels", DEFAULT_SETTINGS.defaultModels),
    routingRules: await getSetting("routingRules", DEFAULT_SETTINGS.routingRules),
    aiLimits: await getSetting("aiLimits", DEFAULT_SETTINGS.aiLimits),
    defaultModel: await getSetting("defaultModel", DEFAULT_SETTINGS.defaultModel),
  };

  return NextResponse.json(settings);
}

/** PATCH /api/admin/settings — update platform settings (admin only). */
export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  const body = (await req.json().catch(() => ({}))) as Partial<PlatformSettings> & {
    providerKey?: string; // raw key for the selected provider
    customModels?: CustomModel[]; // full custom models array (with raw keys for new/edited)
    apiKeys?: ApiKeyConfig[]; // full API keys array (with raw keys for new/edited)
  };

  const changed: string[] = [];

  // Provider selection — auto-fills baseUrl when a known provider is chosen
  if (typeof body.providerId === "string") {
    await setSetting("providerId", body.providerId);
    const provider = AI_PROVIDERS.find((p) => p.id === body.providerId);
    if (provider && provider.baseUrl) {
      await setSetting("baseUrl", provider.baseUrl);
    }
    changed.push("providerId");
  }

  // Handle API key save for the selected provider
  if (typeof body.providerKey === "string" && body.providerKey.trim()) {
    const key = body.providerKey.trim();
    await setSetting("providerKey", key);
    await setSetting("providerKeyMasked", maskKey(key));
    changed.push("providerKey");
  }

  // Allow explicit baseUrl override (for custom providers)
  if (typeof body.baseUrl === "string") {
    await setSetting("baseUrl", body.baseUrl.trim());
    changed.push("baseUrl");
  }

  // Custom models — full replace. Mask any new raw keys before storing.
  if (Array.isArray(body.customModels)) {
    const existing = await getSetting<CustomModel[]>("customModels", []);
    const existingMap = new Map(existing.map((m) => [m.id, m]));

    const sanitized: CustomModel[] = body.customModels.map((m) => {
      // Preserve existing raw key if the incoming key is empty (not changed)
      const prev = existingMap.get(m.id);
      let rawKey = m.apiKey;
      if (!rawKey && prev?.apiKey) rawKey = prev.apiKey; // keep stored key
      return {
        id: m.id,
        name: m.name,
        modelId: m.modelId,
        baseUrl: m.baseUrl,
        apiKey: rawKey,
        apiKeyMasked: rawKey ? maskKey(rawKey) : prev?.apiKeyMasked ?? "",
        provider: m.provider,
        description: m.description ?? "",
        context: m.context ?? "",
        enabled: m.enabled ?? true,
      };
    });
    await setSetting("customModels", sanitized);
    changed.push("customModels");
  }

  // API keys — full replace. Preserve existing raw keys when incoming is empty.
  if (Array.isArray(body.apiKeys)) {
    const existing = await getSetting<ApiKeyConfig[]>("apiKeys", []);
    const existingMap = new Map(existing.map((k) => [k.id, k]));

    // Ensure only one default per role
    let defaultsByRole: Record<string, string | null> = {};
    const sanitized: ApiKeyConfig[] = body.apiKeys.map((k) => {
      const prev = existingMap.get(k.id);
      let rawKey = k.apiKey;
      if (!rawKey && prev?.apiKey) rawKey = prev.apiKey;

      // Track defaults to enforce uniqueness
      const roleKey = k.role;
      if (k.isDefault) {
        if (defaultsByRole[roleKey] !== undefined) {
          // Already have a default for this role — demote this one
          k.isDefault = false;
        } else {
          defaultsByRole[roleKey] = k.id;
        }
      }

      return {
        id: k.id,
        label: k.label,
        role: k.role,
        provider: k.provider,
        baseUrl: k.baseUrl,
        apiKey: rawKey,
        apiKeyMasked: rawKey ? maskKey(rawKey) : prev?.apiKeyMasked ?? "",
        isDefault: k.isDefault,
        createdAt: k.createdAt || prev?.createdAt || new Date().toISOString(),
      };
    });
    await setSetting("apiKeys", sanitized);
    changed.push("apiKeys");
  }

  if (Array.isArray(body.enabledModels)) {
    await setSetting("enabledModels", body.enabledModels);
    changed.push("enabledModels");
  }
  if (typeof body.rateLimitPerMin === "number") {
    await setSetting("rateLimitPerMin", body.rateLimitPerMin);
    changed.push("rateLimitPerMin");
  }
  if (typeof body.rateLimitPerDay === "number") {
    await setSetting("rateLimitPerDay", body.rateLimitPerDay);
    changed.push("rateLimitPerDay");
  }
  if (typeof body.ipAllowlist === "string") {
    await setSetting("ipAllowlist", body.ipAllowlist);
    changed.push("ipAllowlist");
  }
  if (typeof body.requireEmailVerification === "boolean") {
    await setSetting("requireEmailVerification", body.requireEmailVerification);
    changed.push("requireEmailVerification");
  }
  if (typeof body.autoSuspendAbuse === "boolean") {
    await setSetting("autoSuspendAbuse", body.autoSuspendAbuse);
    changed.push("autoSuspendAbuse");
  }
  if (typeof body.blockProxies === "boolean") {
    await setSetting("blockProxies", body.blockProxies);
    changed.push("blockProxies");
  }
  if (typeof body.cacheEnabled === "boolean") {
    await setSetting("cacheEnabled", body.cacheEnabled);
    changed.push("cacheEnabled");
  }
  if (typeof body.cacheTtlSeconds === "number") {
    await setSetting("cacheTtlSeconds", body.cacheTtlSeconds);
    changed.push("cacheTtlSeconds");
  }
  if (typeof body.maxConcurrentStreams === "number") {
    await setSetting("maxConcurrentStreams", body.maxConcurrentStreams);
    changed.push("maxConcurrentStreams");
  }
  if (typeof body.responseTimeoutSeconds === "number") {
    await setSetting("responseTimeoutSeconds", body.responseTimeoutSeconds);
    changed.push("responseTimeoutSeconds");
  }
  if (typeof body.allowSignups === "boolean") {
    await setSetting("allowSignups", body.allowSignups);
    changed.push("allowSignups");
  }
  if (typeof body.maintenanceMode === "boolean") {
    await setSetting("maintenanceMode", body.maintenanceMode);
    changed.push("maintenanceMode");
  }
  if (typeof body.costPerChat === "number") {
    await setSetting("costPerChat", body.costPerChat);
    changed.push("costPerChat");
  }
  if (typeof body.costPerImage === "number") {
    await setSetting("costPerImage", body.costPerImage);
    changed.push("costPerImage");
  }
  if (typeof body.costPerDocument === "number") {
    await setSetting("costPerDocument", body.costPerDocument);
    changed.push("costPerDocument");
  }

  // AI Infrastructure fields (used by the AI Infrastructure Center UI)
  if (body.defaultModels && typeof body.defaultModels === "object") {
    await setSetting("defaultModels", body.defaultModels);
    changed.push("defaultModels");
  }
  if (body.routingRules && typeof body.routingRules === "object") {
    await setSetting("routingRules", body.routingRules);
    changed.push("routingRules");
  }
  if (body.aiLimits && typeof body.aiLimits === "object") {
    await setSetting("aiLimits", body.aiLimits);
    changed.push("aiLimits");
  }
  if (typeof body.defaultModel === "string") {
    await setSetting("defaultModel", body.defaultModel);
    changed.push("defaultModel");
  }

  await logAudit(admin.id, "admin.settings.update", "platform", undefined, { changed: changed.join(", ") });
  return NextResponse.json({ ok: true, changed });
}

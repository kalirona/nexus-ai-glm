import { NextResponse } from "next/server";
import { requireAdmin, logAudit } from "@/lib/auth";
import { getSetting, setSetting, DEFAULT_SETTINGS, type PlatformSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/settings — full platform settings (admin only). */
export async function GET() {
  await requireAdmin();

  const settings: PlatformSettings = {
    providerKey: "", // never return the raw key
    providerKeyMasked: await getSetting("providerKeyMasked", ""),
    baseUrl: await getSetting("baseUrl", DEFAULT_SETTINGS.baseUrl),
    enabledModels: await getSetting("enabledModels", DEFAULT_SETTINGS.enabledModels),
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
  };

  return NextResponse.json(settings);
}

/** PATCH /api/admin/settings — update platform settings (admin only). */
export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  const body = (await req.json().catch(() => ({}))) as Partial<PlatformSettings> & {
    providerKey?: string; // raw key, only on save
  };

  const changed: string[] = [];

  // Handle API key save — mask it, store raw separately (not returned by GET)
  if (typeof body.providerKey === "string" && body.providerKey.trim()) {
    const key = body.providerKey.trim();
    const masked = key.slice(0, 6) + "••••••••" + key.slice(-4);
    await setSetting("providerKey", key);
    await setSetting("providerKeyMasked", masked);
    changed.push("providerKey");
  }

  if (typeof body.baseUrl === "string") {
    await setSetting("baseUrl", body.baseUrl.trim());
    changed.push("baseUrl");
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

  await logAudit(admin.id, "admin.settings.update", "platform", undefined, { changed: changed.join(", ") });

  return NextResponse.json({ ok: true, changed });
}

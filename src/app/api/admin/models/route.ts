import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSetting, DEFAULT_SETTINGS } from "@/lib/settings";
import { AI_MODELS } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/models — built-in catalog + custom models, with enabled status. */
export async function GET() {
  await requireAdmin();
  const enabled = await getSetting<string[]>("enabledModels", DEFAULT_SETTINGS.enabledModels);
  const customModels = await getSetting("customModels", DEFAULT_SETTINGS.customModels);

  const builtin = AI_MODELS.map((m) => ({
    ...m,
    kind: "builtin" as const,
    enabled: enabled.includes(m.id),
    baseUrl: "",
    provider: "",
  }));

  const custom = customModels.map((m) => ({
    id: m.id,
    name: m.name,
    description: m.description || `${m.modelId} via ${m.provider}`,
    badge: "Custom",
    context: m.context || "—",
    speed: "custom",
    kind: "custom" as const,
    enabled: m.enabled,
    baseUrl: m.baseUrl,
    provider: m.provider,
    modelId: m.modelId,
    apiKeyMasked: m.apiKeyMasked,
  }));

  return NextResponse.json({ models: [...builtin, ...custom], enabled });
}

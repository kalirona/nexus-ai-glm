import { NextResponse } from "next/server";
import { requireAdmin, logAudit } from "@/lib/auth";
import { getConfiguredProviders } from "@/lib/provider-service";
import { getSetting, setSetting } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/providers — list all 16 providers with configured state. */
export async function GET() {
  await requireAdmin();
  const providers = await getConfiguredProviders();
  return NextResponse.json({ providers });
}

/** PATCH /api/admin/providers — update provider config (active toggle, org/region, timeout). */
export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  const body = (await req.json().catch(() => ({}))) as {
    providerId: string;
    active?: boolean;
    orgId?: string;
    projectId?: string;
    region?: string;
    timeout?: number;
    retryCount?: number;
  };

  if (!body.providerId) {
    return NextResponse.json({ error: "providerId is required" }, { status: 400 });
  }

  const providerConfigs = await getSetting<Record<string, Record<string, unknown>>>("providerConfigs", {});
  if (!providerConfigs[body.providerId]) providerConfigs[body.providerId] = {};

  if (typeof body.active === "boolean") providerConfigs[body.providerId].active = body.active;
  if (typeof body.orgId === "string") providerConfigs[body.providerId].orgId = body.orgId;
  if (typeof body.projectId === "string") providerConfigs[body.providerId].projectId = body.projectId;
  if (typeof body.region === "string") providerConfigs[body.providerId].region = body.region;
  if (typeof body.timeout === "number") providerConfigs[body.providerId].timeout = body.timeout;
  if (typeof body.retryCount === "number") providerConfigs[body.providerId].retryCount = body.retryCount;

  await setSetting("providerConfigs", providerConfigs);
  await logAudit(admin.id, "admin.provider.update", "provider", body.providerId);

  return NextResponse.json({ ok: true });
}

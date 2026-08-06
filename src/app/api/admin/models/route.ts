import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSetting, DEFAULT_SETTINGS } from "@/lib/settings";
import { AI_MODELS } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/models — model catalog with enabled status. */
export async function GET() {
  await requireAdmin();
  const enabled = await getSetting<string[]>("enabledModels", DEFAULT_SETTINGS.enabledModels);

  const models = AI_MODELS.map((m) => ({
    ...m,
    enabled: enabled.includes(m.id),
  }));

  return NextResponse.json({ models, enabled });
}

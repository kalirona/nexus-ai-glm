import { NextResponse } from "next/server";
import { requireAdmin, logAudit } from "@/lib/auth";
import { syncProviderModels } from "@/lib/sync-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/admin/models/sync/:providerId — sync models from a provider's live API. */
export async function POST(_req: Request, { params }: { params: Promise<{ providerId: string }> }) {
  const admin = await requireAdmin();
  const { providerId } = await params;

  const report = await syncProviderModels(providerId);

  await logAudit(admin.id, "admin.models.sync", "provider", providerId, {
    catalogModels: report.catalogModels,
    newModels: report.newModels,
    updatedModels: report.updatedModels,
    unavailable: report.unavailable,
    duration: report.duration,
    error: report.error,
  });

  return NextResponse.json(report);
}

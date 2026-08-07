import { NextResponse } from "next/server";
import { requireAdmin, logAudit } from "@/lib/auth";
import { verifyModel } from "@/lib/sync-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/admin/models/registry/:id/verify — verify a model by sending a lightweight request. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;

  const result = await verifyModel(id);

  await logAudit(admin.id, "admin.model.verify", "ai-model", id, {
    verified: result.verified,
    latencyMs: result.latencyMs,
    error: result.error,
  });

  return NextResponse.json(result);
}

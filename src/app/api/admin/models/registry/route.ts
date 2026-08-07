import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/models/registry — all models in the three-layer registry with filters. */
export async function GET(req: Request) {
  await requireAdmin();
  const url = new URL(req.url);
  const providerId = url.searchParams.get("provider");
  const layer = url.searchParams.get("layer"); // catalog | verified | approved
  const search = url.searchParams.get("q");

  const where: Record<string, unknown> = {};
  if (providerId && providerId !== "all") where.providerId = providerId;
  if (search) where.displayName = { contains: search };

  if (layer === "verified") {
    where.verificationStatus = "verified";
  } else if (layer === "approved") {
    where.approved = true;
  }

  const models = await db.aiModel.findMany({
    where,
    orderBy: [{ approved: "desc" }, { verificationStatus: "asc" }, { displayName: "asc" }],
    take: 500,
  });

  return NextResponse.json({
    models,
    counts: {
      catalog: await db.aiModel.count(),
      verified: await db.aiModel.count({ where: { verificationStatus: "verified" } }),
      approved: await db.aiModel.count({ where: { approved: true } }),
      healthy: await db.aiModel.count({ where: { healthStatus: "healthy" } }),
    },
  });
}

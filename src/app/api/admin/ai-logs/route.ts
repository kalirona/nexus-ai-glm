import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/ai-logs — AI request logs with filtering. */
export async function GET(req: Request) {
  await requireAdmin();
  const url = new URL(req.url);
  const provider = url.searchParams.get("provider");
  const success = url.searchParams.get("success");
  const requestType = url.searchParams.get("type");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 500);

  const where: Record<string, unknown> = {};
  if (provider && provider !== "all") where.provider = provider;
  if (requestType && requestType !== "all") where.requestType = requestType;
  if (success === "true") where.success = true;
  if (success === "false") where.success = false;

  const logs = await db.aiUsageLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ logs, count: logs.length });
}

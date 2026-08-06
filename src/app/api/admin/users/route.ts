import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, logAudit } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/users — list all platform users (admin only). */
export async function GET(req: Request) {
  const admin = await requireAdmin();
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const status = url.searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { email: { contains: q } },
    ];
  }
  if (status && status !== "all") where.status = status;

  const users = await db.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      email: true,
      plan: true,
      credits: true,
      isAdmin: true,
      status: true,
      createdAt: true,
    },
  });

  await logAudit(admin.id, "admin.users.view", "user");
  return NextResponse.json(users);
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/stats — platform-level metrics for the super admin dashboard. */
export async function GET() {
  await requireAdmin();

  const [
    totalUsers,
    activeUsers,
    suspendedUsers,
    proUsers,
    agencyUsers,
    totalChats,
    totalDocuments,
    totalImages,
    allTransactions,
    toolAudits,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { status: "active" } }),
    db.user.count({ where: { status: { in: ["suspended", "banned"] } } }),
    db.user.count({ where: { plan: "pro" } }),
    db.user.count({ where: { plan: "agency" } }),
    db.chat.count(),
    db.document.count(),
    db.image.count(),
    db.creditTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 90,
      select: { amount: true, reason: true, createdAt: true },
    }),
    // Recent generator usage — seo/marketing/youtube actions from the last 30 days
    db.auditLog.findMany({
      where: {
        action: { in: ["seo.generate", "marketing.generate", "youtube.generate"] },
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: { action: true, resource: true, createdAt: true },
      take: 500,
    }),
  ]);

  const creditsConsumed = allTransactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const starterUsers = Math.max(0, totalUsers - proUsers - agencyUsers);
  const estimatedMrr = proUsers * 49 + agencyUsers * 149 + starterUsers * 19;

  const days: { label: string; credits: number }[] = [];
  const dayMs = 24 * 60 * 60 * 1000;
  for (let i = 6; i >= 0; i--) {
    const start = new Date(new Date().setHours(0, 0, 0, 0) - i * dayMs);
    const end = new Date(start.getTime() + dayMs);
    const dayTx = allTransactions.filter(
      (t) => new Date(t.createdAt) >= start && new Date(t.createdAt) < end
    );
    days.push({
      label: start.toLocaleDateString("en-US", { weekday: "short" }),
      credits: dayTx.reduce((a, t) => a + Math.abs(t.amount), 0),
    });
  }

  // Build tool usage breakdown — group audit logs by action+resource
  // resource holds the tool id (e.g. "keywords", "fb-ad", "titles")
  const toolCounts: Record<string, number> = {};
  for (const a of toolAudits) {
    const key = `${a.action}:${a.resource}`;
    toolCounts[key] = (toolCounts[key] ?? 0) + 1;
  }
  const toolUsage = Object.entries(toolCounts)
    .map(([key, count]) => {
      const [action, resource] = key.split(":");
      const moduleLabel =
        action === "seo.generate" ? "SEO" :
        action === "marketing.generate" ? "Marketing" :
        action === "youtube.generate" ? "YouTube" : action;
      return { module: moduleLabel, tool: resource, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return NextResponse.json({
    totals: {
      users: totalUsers,
      activeUsers,
      suspendedUsers,
      proUsers,
      agencyUsers,
      starterUsers,
      chats: totalChats,
      documents: totalDocuments,
      images: totalImages,
      creditsConsumed,
      estimatedMrr,
    },
    series: days,
    toolUsage,
  });
}

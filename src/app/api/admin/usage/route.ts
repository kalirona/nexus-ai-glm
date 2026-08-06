import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/usage — real AI usage analytics from AiUsageLog. */
export async function GET() {
  await requireAdmin();

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalRequests,
    requestsToday,
    requestsThisMonth,
    allLogs,
    recentLogs,
    errorCount,
    streamingCount,
    imageCount,
  ] = await Promise.all([
    db.aiUsageLog.count(),
    db.aiUsageLog.count({ where: { createdAt: { gte: dayAgo } } }),
    db.aiUsageLog.count({ where: { createdAt: { gte: monthAgo } } }),
    db.aiUsageLog.findMany({ where: { createdAt: { gte: sevenDaysAgo } }, select: { provider: true, model: true, totalTokens: true, cost: true, durationMs: true, success: true, requestType: true, createdAt: true } }),
    db.aiUsageLog.findMany({ orderBy: { createdAt: "desc" }, take: 50, select: { id: true, provider: true, model: true, requestType: true, totalTokens: true, cost: true, durationMs: true, success: true, errorMessage: true, streaming: true, createdAt: true } }),
    db.aiUsageLog.count({ where: { success: false } }),
    db.aiUsageLog.count({ where: { streaming: true } }),
    db.aiUsageLog.count({ where: { requestType: "image" } }),
  ]);

  // Aggregate by provider
  const byProvider: Record<string, { requests: number; tokens: number; cost: number }> = {};
  const byModel: Record<string, { requests: number; tokens: number; cost: number }> = {};
  let totalTokens = 0;
  let totalCost = 0;
  let totalDuration = 0;

  // 7-day series
  const days: { label: string; requests: number; tokens: number; cost: number; errors: number }[] = [];
  const dayMs = 24 * 60 * 60 * 1000;
  for (let i = 6; i >= 0; i--) {
    const start = new Date(new Date().setHours(0, 0, 0, 0) - i * dayMs);
    const end = new Date(start.getTime() + dayMs);
    const dayLogs = allLogs.filter((l) => new Date(l.createdAt) >= start && new Date(l.createdAt) < end);
    days.push({
      label: start.toLocaleDateString("en-US", { weekday: "short" }),
      requests: dayLogs.length,
      tokens: dayLogs.reduce((a, l) => a + l.totalTokens, 0),
      cost: dayLogs.reduce((a, l) => a + l.cost, 0),
      errors: dayLogs.filter((l) => !l.success).length,
    });
  }

  for (const log of allLogs) {
    totalTokens += log.totalTokens;
    totalCost += log.cost;
    totalDuration += log.durationMs;

    if (!byProvider[log.provider]) byProvider[log.provider] = { requests: 0, tokens: 0, cost: 0 };
    byProvider[log.provider].requests++;
    byProvider[log.provider].tokens += log.totalTokens;
    byProvider[log.provider].cost += log.cost;

    if (!byModel[log.model]) byModel[log.model] = { requests: 0, tokens: 0, cost: 0 };
    byModel[log.model].requests++;
    byModel[log.model].tokens += log.totalTokens;
    byModel[log.model].cost += log.cost;
  }

  const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;
  const avgLatency = totalRequests > 0 ? Math.round(totalDuration / totalRequests) : 0;

  return NextResponse.json({
    totals: {
      totalRequests,
      requestsToday,
      requestsThisMonth,
      totalTokens,
      totalCost: parseFloat(totalCost.toFixed(4)),
      errorRate: parseFloat(errorRate.toFixed(2)),
      avgLatency,
      streamingRequests: streamingCount,
      imageRequests: imageCount,
      errorCount,
    },
    series: days,
    byProvider: Object.entries(byProvider).map(([provider, v]) => ({ provider, ...v })).sort((a, b) => b.requests - a.requests),
    byModel: Object.entries(byModel).map(([model, v]) => ({ model, ...v })).sort((a, b) => b.requests - a.requests).slice(0, 20),
    recent: recentLogs,
  });
}

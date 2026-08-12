import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/history?module=seo
 * Returns the user's recent generator history for a given module.
 * Capped at 10 entries, newest first.
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  const { searchParams } = new URL(req.url);
  const moduleName = searchParams.get("module");

  if (!moduleName) {
    return NextResponse.json({ error: "module query param is required" }, { status: 400 });
  }

  const entries = await db.generatorHistory.findMany({
    where: { userId: user.id, module: moduleName },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      module: true,
      tool: true,
      toolLabel: true,
      input: true,
      result: true,
      createdAt: true,
    },
  });

  return NextResponse.json(entries);
}

/**
 * POST /api/history
 * Create a new history entry. The client calls this after a successful
 * generation so the result is persisted across devices/sessions.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  const body = (await req.json().catch(() => ({}))) as {
    module?: string;
    tool?: string;
    toolLabel?: string;
    input?: string;
    result?: string;
  };

  if (!body.module || !body.tool || !body.result) {
    return NextResponse.json({ error: "module, tool and result are required" }, { status: 400 });
  }

  // Cap at 10 per module — delete oldest beyond the cap
  const existing = await db.generatorHistory.count({
    where: { userId: user.id, module: body.module },
  });

  if (existing >= 10) {
    // Find the oldest entry and delete it
    const oldest = await db.generatorHistory.findFirst({
      where: { userId: user.id, module: body.module },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (oldest) {
      await db.generatorHistory.delete({ where: { id: oldest.id } });
    }
  }

  const entry = await db.generatorHistory.create({
    data: {
      userId: user.id,
      module: body.module,
      tool: body.tool,
      toolLabel: body.toolLabel ?? body.tool,
      input: (body.input ?? "").slice(0, 200),
      result: body.result,
    },
  });

  return NextResponse.json(entry);
}

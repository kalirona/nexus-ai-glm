import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logAudit } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/folders — list folders (chat kind by default). */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") || "chat";

  const folders = await db.folder.findMany({
    where: { userId: user.id, kind },
    orderBy: [{ createdAt: "asc" }],
    include: {
      chats: {
        where: { archived: false },
        select: { id: true, title: true, updatedAt: true, pinned: true, model: true },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  return NextResponse.json(folders);
}

/** POST /api/folders — create a folder. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    kind?: string;
    color?: string;
    icon?: string;
  };
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const folder = await db.folder.create({
    data: {
      userId: user.id,
      name,
      kind: body.kind || "chat",
      color: body.color || "emerald",
      icon: body.icon || "folder",
    },
  });
  await logAudit(user.id, "folder.create", "folder", folder.id);
  return NextResponse.json(folder);
}

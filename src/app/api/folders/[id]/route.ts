import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PATCH /api/folders/:id — rename / recolor / move chats into folder. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    color?: string;
    icon?: string;
  };

  const existing = await db.folder.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") data.name = body.name.slice(0, 100);
  if (typeof body.color === "string") data.color = body.color;
  if (typeof body.icon === "string") data.icon = body.icon;

  const updated = await db.folder.update({ where: { id }, data });
  return NextResponse.json(updated);
}

/** DELETE /api/folders/:id — removes folder; chats fall back to no folder. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const r = await db.folder.deleteMany({ where: { id, userId: user.id } });
  if (r.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}

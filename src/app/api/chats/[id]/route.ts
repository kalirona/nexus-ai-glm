import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/chats/:id — chat with messages. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const chat = await db.chat.findFirst({
    where: { id, userId: user.id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, role: true, content: true, model: true, createdAt: true },
      },
    },
  });
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(chat);
}

/** PATCH /api/chats/:id — update title / pinned / archived. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    pinned?: boolean;
    archived?: boolean;
    model?: string;
  };
  const data: Record<string, unknown> = {};
  if (typeof body.title === "string") data.title = body.title.slice(0, 200);
  if (typeof body.pinned === "boolean") data.pinned = body.pinned;
  if (typeof body.archived === "boolean") data.archived = body.archived;
  if (typeof body.model === "string") data.model = body.model;

  const chat = await db.chat.updateMany({ where: { id, userId: user.id }, data });
  if (chat.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const updated = await db.chat.findFirst({ where: { id, userId: user.id } });
  return NextResponse.json(updated);
}

/** DELETE /api/chats/:id */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const r = await db.chat.deleteMany({ where: { id, userId: user.id } });
  if (r.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}

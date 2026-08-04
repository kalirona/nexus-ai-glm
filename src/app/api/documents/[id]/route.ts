import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/documents/:id */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const doc = await db.document.findFirst({
    where: { id, userId: user.id },
    include: {
      versions: { orderBy: { version: "desc" }, take: 20 },
    },
  });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(doc);
}

/** PATCH /api/documents/:id — update content (creates a new version). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const body = (await req.json().catch(() => ({}))) as { title?: string; content?: string };

  const existing = await db.document.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (typeof body.title === "string") data.title = body.title.slice(0, 200);
  if (typeof body.content === "string") data.content = body.content;
  data.updatedAt = new Date();

  const updated = await db.document.update({ where: { id }, data });

  if (typeof body.content === "string" && body.content !== existing.content) {
    const lastVersion = await db.documentVersion.findFirst({
      where: { documentId: id },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    await db.documentVersion.create({
      data: { documentId: id, content: body.content, version: (lastVersion?.version ?? 0) + 1 },
    });
  }

  return NextResponse.json(updated);
}

/** DELETE /api/documents/:id */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const r = await db.document.deleteMany({ where: { id, userId: user.id } });
  if (r.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}

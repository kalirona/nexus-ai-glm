import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logAudit } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/documents — list documents. */
export async function GET() {
  const user = await getCurrentUser();
  const docs = await db.document.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, kind: true, tags: true, updatedAt: true, createdAt: true },
    take: 100,
  });
  return NextResponse.json(docs);
}

/** POST /api/documents — create a document (manual or saved from a generator). */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  const { title, content, kind, tags } = (await req.json().catch(() => ({}))) as {
    title?: string;
    content?: string;
    kind?: string;
    tags?: string;
  };
  const doc = await db.document.create({
    data: {
      userId: user.id,
      title: title?.trim() || "Untitled document",
      content: content ?? "",
      kind: kind ?? "generic",
      tags: tags?.trim() || null,
    },
  });
  await db.documentVersion.create({
    data: { documentId: doc.id, content: doc.content, version: 1 },
  });
  await logAudit(user.id, "document.create", "document", doc.id, { kind, tags });
  return NextResponse.json(doc);
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/images/:id — single image with base64. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const image = await db.image.findFirst({
    where: { id, userId: user.id },
    select: { id: true, prompt: true, size: true, base64: true, kind: true, createdAt: true },
  });
  if (!image) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(image);
}

/** DELETE /api/images/:id */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const r = await db.image.deleteMany({ where: { id, userId: user.id } });
  if (r.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}

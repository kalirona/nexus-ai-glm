import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/images — list gallery (without heavy base64 payload). */
export async function GET() {
  const user = await getCurrentUser();
  const images = await db.image.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, prompt: true, size: true, kind: true, createdAt: true },
    take: 100,
  });
  return NextResponse.json(images);
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logAudit } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** DELETE /api/user/api-keys/:id — revoke an API key (soft delete). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  // Verify ownership before revoking
  const key = await db.apiKey.findFirst({
    where: { id, userId: user.id, revokedAt: null },
    select: { id: true, name: true },
  });
  if (!key) return NextResponse.json({ error: "Key not found" }, { status: 404 });

  await db.apiKey.update({
    where: { id },
    data: { revokedAt: new Date() },
  });

  await logAudit(user.id, "api-key.revoke", "api-key", id, { name: key.name });
  return new NextResponse(null, { status: 204 });
}

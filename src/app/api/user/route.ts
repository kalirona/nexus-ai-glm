import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logAudit } from "@/lib/auth";
import { seedCatalog } from "@/lib/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/user — current workspace user. */
export async function GET() {
  await seedCatalog();
  const user = await getCurrentUser();
  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    plan: user.plan,
    credits: user.credits,
    creditsResetAt: user.creditsResetAt,
    avatarUrl: user.avatarUrl,
    isAdmin: user.isAdmin,
  });
}

/** PATCH /api/user — update the current user's profile (name, avatarUrl). */
export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    avatarUrl?: string;
  };

  const data: { name?: string; avatarUrl?: string | null } = {};
  if (body.name !== undefined) {
    const name = body.name.trim();
    if (name.length < 1) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    if (name.length > 80) return NextResponse.json({ error: "Name is too long (max 80 chars)" }, { status: 400 });
    data.name = name;
  }
  if (body.avatarUrl !== undefined) {
    data.avatarUrl = body.avatarUrl?.trim() || null;
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data,
    select: { id: true, name: true, email: true, avatarUrl: true },
  });

  await logAudit(user.id, "user.update", "user", user.id, { fields: Object.keys(data) });
  return NextResponse.json(updated);
}

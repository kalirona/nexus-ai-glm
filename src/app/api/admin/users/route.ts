import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, logAudit } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/users — list all platform users (admin only). */
export async function GET(req: Request) {
  const admin = await requireAdmin();
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const status = url.searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { email: { contains: q } },
    ];
  }
  if (status && status !== "all") where.status = status;

  const users = await db.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      email: true,
      plan: true,
      credits: true,
      isAdmin: true,
      status: true,
      createdAt: true,
    },
  });

  await logAudit(admin.id, "admin.users.view", "user");
  return NextResponse.json(users);
}

/** POST /api/admin/users — create a new user (admin only). */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    email?: string;
    plan?: string;
    credits?: number;
    isAdmin?: boolean;
  };

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!email || !email.includes("@")) return NextResponse.json({ error: "Valid email is required" }, { status: 400 });

  // Check for duplicate email
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });

  const user = await db.user.create({
    data: {
      name,
      email,
      plan: body.plan || "free",
      credits: typeof body.credits === "number" ? body.credits : 200,
      isAdmin: !!body.isAdmin,
      status: "active",
      creditsResetAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    },
    select: {
      id: true,
      name: true,
      email: true,
      plan: true,
      credits: true,
      isAdmin: true,
      status: true,
      createdAt: true,
    },
  });

  await logAudit(admin.id, "admin.user.create", "user", user.id, { email });
  return NextResponse.json(user, { status: 201 });
}

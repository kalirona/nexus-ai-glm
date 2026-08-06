import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, logAudit } from "@/lib/auth";
import { PLANS } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_PLANS = new Set(PLANS.map((p) => p.id));
const VALID_STATUSES = new Set(["active", "suspended", "banned"]);

/** PATCH /api/admin/users/:id — update a user's plan, status, or grant credits. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    plan?: string;
    status?: string;
    grantCredits?: number;
    isAdmin?: boolean;
  };

  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  const actions: string[] = [];

  if (body.plan !== undefined) {
    if (!VALID_PLANS.has(body.plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    data.plan = body.plan;
    actions.push(`plan → ${body.plan}`);
  }

  if (body.status !== undefined) {
    if (!VALID_STATUSES.has(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    data.status = body.status;
    actions.push(`status → ${body.status}`);
  }

  if (typeof body.isAdmin === "boolean") {
    data.isAdmin = body.isAdmin;
    actions.push(`admin → ${body.isAdmin}`);
  }

  if (typeof body.grantCredits === "number" && body.grantCredits !== 0) {
    data.credits = { increment: body.grantCredits };
    actions.push(`credits ${body.grantCredits > 0 ? "+" : ""}${body.grantCredits}`);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No changes specified" }, { status: 400 });
  }

  const updated = await db.user.update({ where: { id }, data });

  // Log a credit transaction if credits were granted
  if (typeof body.grantCredits === "number" && body.grantCredits !== 0) {
    await db.creditTransaction.create({
      data: {
        userId: id,
        amount: body.grantCredits,
        reason: body.grantCredits > 0 ? "grant" : "admin-adjust",
      },
    });
  }

  await logAudit(admin.id, "admin.user.update", "user", id, { actions: actions.join(", ") });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    plan: updated.plan,
    credits: updated.credits,
    isAdmin: updated.isAdmin,
    status: updated.status,
    createdAt: updated.createdAt,
  });
}

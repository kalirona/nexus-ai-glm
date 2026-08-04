import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { PLANS } from "@/lib/constants";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/billing — plans, current subscription & recent transactions. */
export async function GET() {
  const user = await getCurrentUser();
  const transactions = await db.creditTransaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 25,
    select: { id: true, amount: true, reason: true, refId: true, createdAt: true },
  });

  const current = PLANS.find((p) => p.id === user.plan) ?? PLANS[0];

  return NextResponse.json({
    current: {
      plan: user.plan,
      credits: user.credits,
      creditsResetAt: user.creditsResetAt,
      name: user.name,
      email: user.email,
    },
    plans: PLANS,
    transactions,
  });
}

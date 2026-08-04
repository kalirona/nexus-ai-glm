import { db } from "@/lib/db";

/**
 * Identity layer.
 *
 * The schema is fully multi-tenant, but the MVP runs a single local
 * workspace (sandbox preview) so users can experience the product without
 * signing up. `getCurrentUser()` returns that workspace owner, creating it
 * lazily. Real auth (Better Auth / NextAuth) drops in here later without
 * touching feature code.
 */

const DEMO_EMAIL = "founder@nexusai.app";

export async function getCurrentUser() {
  let user = await db.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!user) {
    try {
      user = await db.user.create({
        data: {
          email: DEMO_EMAIL,
          name: "Alex Founder",
          plan: "pro",
          credits: 18500,
          avatarUrl: null,
          creditsResetAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 12),
        },
      });
    } catch (err) {
      // Race: another concurrent request created the user first — refetch.
      const e = err as { code?: string };
      if (e?.code === "P2002") {
        user = await db.user.findUnique({ where: { email: DEMO_EMAIL } });
      }
      if (!user) throw err;
    }
  }
  return user!;
}

export async function spendCredits(userId: string, amount: number, reason: string, refId?: string) {
  const [_, tx] = await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: { credits: { decrement: amount } },
    }),
    db.creditTransaction.create({
      data: { userId, amount: -amount, reason, refId },
    }),
  ]);
  return tx;
}

export async function logAudit(
  userId: string,
  action: string,
  resource: string,
  resourceId?: string,
  meta?: Record<string, unknown>
) {
  await db.auditLog.create({
    data: {
      userId,
      action,
      resource,
      resourceId,
      meta: meta ? JSON.stringify(meta) : null,
    },
  });
}

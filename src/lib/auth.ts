import { db } from "@/lib/db";

/**
 * Identity layer — Clerk integration with explicit demo mode.
 *
 * AUTH_MODE controls behavior:
 *   - "demo" (default in dev): returns demo user when no Clerk session exists.
 *     This allows the sandbox/preview to work without Clerk credentials.
 *   - "clerk" (default in production): requires a valid Clerk session.
 *     Missing session = 401 (fail closed). Never falls back to demo user.
 *
 * The contract (Prisma User object) is preserved — all feature code calls
 * getCurrentUser() and gets a User, regardless of auth mode.
 *
 * Security:
 *   - Client never supplies userId — always derived from authenticated session.
 *   - clerkId is the durable external identity (not email).
 *   - Banned users get 403.
 *   - isAdmin cannot be self-promoted (only via webhook or admin route).
 */

const AUTH_MODE = process.env.AUTH_MODE || (process.env.NODE_ENV === "production" ? "clerk" : "demo");

// Lazy-load Clerk only when needed (avoids crash when Clerk keys are missing)
async function getClerkUser(): Promise<{ id: string; email: string; name: string; imageUrl: string | null } | null> {
  try {
    const { currentUser } = await import("@clerk/nextjs/server");
    const clerkUser = await currentUser();
    if (!clerkUser) return null;
    return {
      id: clerkUser.id,
      email: clerkUser.emailAddresses?.[0]?.emailAddress || "",
      name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || "",
      imageUrl: clerkUser.imageUrl || null,
    };
  } catch {
    // Clerk not configured or not in middleware context — return null
    return null;
  }
}

export async function getCurrentUser() {
  // Try to get the Clerk session user (lazy import — won't crash if Clerk not configured)
  const clerkUser = await getClerkUser();

  if (!clerkUser) {
    if (AUTH_MODE === "demo") {
      // Demo mode (sandbox/preview) — return the demo user
      return getDemoUser();
    }
    // Clerk mode — fail closed, never return demo user in production
    throw new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const clerkId = clerkUser.id;
  const email = clerkUser.email;
  const name = clerkUser.name || email.split("@")[0] || "User";

  // 1. Look up by clerkId (primary identity)
  let user = await db.user.findUnique({ where: { clerkId } });

  // 2. If not found by clerkId, try by email (links pre-existing users)
  if (!user && email) {
    user = await db.user.findUnique({ where: { email } });
    if (user) {
      user = await db.user.update({
        where: { id: user.id },
        data: { clerkId },
      });
    }
  }

  // 3. If still not found, create from Clerk data (lazy sync)
  if (!user) {
    try {
      user = await db.user.create({
        data: {
          clerkId,
          email: email || `unknown-${clerkId}@nexusai.app`,
          name,
          plan: "free",
          credits: 200,
          creditsResetAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
          avatarUrl: clerkUser.imageUrl || null,
        },
      });
    } catch (err) {
      const e = err as { code?: string };
      if (e?.code === "P2002") {
        user = await db.user.findUnique({ where: { clerkId } });
      }
      if (!user) throw err;
    }
  }

  // 4. Check banned status
  if (user!.status === "banned") {
    throw new Response(JSON.stringify({ error: "Account suspended" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return user!;
}

/** Demo user fallback — ONLY active when AUTH_MODE=demo (sandbox/preview). */
async function getDemoUser() {
  const DEMO_EMAIL = "founder@nexusai.app";
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
          isAdmin: true,
          creditsResetAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 12),
        },
      });
    } catch (err) {
      const e = err as { code?: string };
      if (e?.code === "P2002") {
        user = await db.user.findUnique({ where: { email: DEMO_EMAIL } });
      }
      if (!user) throw err;
    }
  }
  if (user && !user.isAdmin && user.email === DEMO_EMAIL) {
    user = await db.user.update({
      where: { id: user.id },
      data: { isAdmin: true },
    });
  }
  return user!;
}

/** Returns the current user or throws 403 if not an admin. */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user.isAdmin) {
    throw new Response(JSON.stringify({ error: "Admin access required" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}

/**
 * Spend credits atomically (decrement + log transaction).
 * Uses conditional update — only decrements if user has enough credits.
 * This prevents negative balances under concurrent requests.
 */
export async function spendCredits(userId: string, amount: number, reason: string, refId?: string) {
  const updated = await db.user.updateMany({
    where: { id: userId, credits: { gte: amount } },
    data: { credits: { decrement: amount } },
  });

  if (updated.count === 0) {
    throw new Response(JSON.stringify({ error: "Insufficient credits" }), {
      status: 402,
      headers: { "Content-Type": "application/json" },
    });
  }

  await db.creditTransaction.create({
    data: { userId, amount: -amount, reason, refId },
  });
}

/** Log an admin action to the audit trail. */
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

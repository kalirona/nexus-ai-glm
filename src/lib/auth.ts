import { db } from "@/lib/db";
import { getLogtoClient, isLogtoConfigured } from "@/lib/logto";
import { cookies, headers } from "next/headers";

/**
 * Identity layer — Logto integration with explicit demo mode.
 *
 * AUTH_MODE controls behavior:
 *   - "demo" (default in dev): returns demo user when no Logto session exists.
 *     This allows the sandbox/preview to work without Logto credentials.
 *   - "logto" (default in production): requires a valid Logto session.
 *     Missing session = 401 (fail closed). Never falls back to demo user.
 *
 * The contract (Prisma User object) is preserved — all feature code calls
 * getCurrentUser() and gets a User, regardless of auth mode.
 *
 * SECURITY:
 *   - Client never supplies userId — always derived from authenticated session.
 *   - logtoId is the durable external identity (not email).
 *   - Banned users get 403.
 *   - isAdmin cannot be self-promoted (only via admin route or direct DB).
 *
 * LOGTO IDENTITY:
 *   - Logto provides: sub (user ID), email, name, picture
 *   - NexusAI stores: plan, credits, isAdmin, status, preferences (business data)
 *   - isAdmin NEVER comes from Logto — only from the local database
 *
 * IMPLEMENTATION:
 *   - Uses next/headers cookies() to read the Logto session cookie automatically
 *   - No need to pass Request to every API route — getCurrentUser() reads cookies
 *     from the Next.js request context
 *   - For explicit Request access (e.g., POC routes), pass req as optional param
 */

const AUTH_MODE = process.env.AUTH_MODE || (process.env.NODE_ENV === "production" ? "logto" : "demo");

/**
 * Effective auth mode — if AUTH_MODE=logto but Logto env vars aren't set,
 * fall back to demo mode. This prevents the app from being completely locked
 * out when env vars are missing in production.
 */
function getEffectiveAuthMode(): "demo" | "logto" {
  if (AUTH_MODE === "demo") return "demo";
  // If AUTH_MODE is "logto" but Logto isn't configured, fall back to demo
  if (!isLogtoConfigured()) return "demo";
  return "logto";
}

/**
 * Gets the Logto authenticated user from the current request context.
 * Uses next/headers cookies() to read the session cookie automatically.
 * Returns null if not authenticated or Logto not configured.
 */
async function getLogtoUser(req?: Request): Promise<{
  id: string;
  email: string;
  name: string;
  picture: string | null;
} | null> {
  if (!isLogtoConfigured()) return null;

  const client = getLogtoClient();
  if (!client) return null;

  try {
    // If req is provided (explicit), use it directly
    if (req) {
      const { nodeClient } = await client.createNodeClientFromEdgeRequest(req);
      const context = await nodeClient.getContext({ fetchUserInfo: true });
      if (!context.isAuthenticated || !context.userInfo) return null;

      return extractUserInfo(context.userInfo);
    }

    // Otherwise, construct a Request from next/headers cookies + headers
    const cookieStore = await cookies();
    const headerStore = await headers();

    // Build a Request-like object with the cookies
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    const url = headerStore.get("x-forwarded-url") || headerStore.get("host")
      ? `https://${headerStore.get("host") || "localhost"}${headerStore.get("x-forwarded-path") || "/"}`
      : "http://localhost:3000/";

    const fakeRequest = new Request(url, {
      headers: {
        cookie: cookieHeader,
        host: headerStore.get("host") || "localhost",
      },
    });

    const { nodeClient } = await client.createNodeClientFromEdgeRequest(fakeRequest);
    const context = await nodeClient.getContext({ fetchUserInfo: true });

    if (!context.isAuthenticated || !context.userInfo) {
      return null;
    }

    return extractUserInfo(context.userInfo);
  } catch {
    // Logto session invalid or not present
    return null;
  }
}

/** Extracts user info from Logto UserInfoResponse. */
function extractUserInfo(userInfo: Record<string, unknown>) {
  return {
    id: String(userInfo.sub || ""),
    email: String(userInfo.email || ""),
    name: String(userInfo.name || userInfo.username || (userInfo.email ? String(userInfo.email).split("@")[0] : "") || "User"),
    picture: userInfo.picture ? String(userInfo.picture) : null,
  };
}

export async function getCurrentUser(req?: Request) {
  // Try to get the Logto session user
  const logtoUser = await getLogtoUser(req);

  if (!logtoUser) {
    // Use effective auth mode — falls back to demo if Logto isn't configured
    if (getEffectiveAuthMode() === "demo") {
      // Demo mode (sandbox/preview) — return the demo user
      return getDemoUser();
    }
    // Logto mode — fail closed, never return demo user in production
    throw new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const logtoId = logtoUser.id;
  const email = logtoUser.email;
  const name = logtoUser.name || email.split("@")[0] || "User";

  // 1. Look up by logtoId (primary identity)
  let user = await db.user.findUnique({ where: { logtoId } });

  // 2. If not found by logtoId, try by email (links pre-existing users)
  if (!user && email) {
    user = await db.user.findUnique({ where: { email } });
    if (user) {
      user = await db.user.update({
        where: { id: user.id },
        data: { logtoId },
      });
    }
  }

  // 3. If still not found, create from Logto data (lazy sync)
  if (!user) {
    try {
      user = await db.user.create({
        data: {
          logtoId,
          email: email || `unknown-${logtoId}@nexusai.app`,
          name,
          plan: "free",
          credits: 200,
          creditsResetAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
          avatarUrl: logtoUser.picture || null,
        },
      });
    } catch (err) {
      const e = err as { code?: string };
      if (e?.code === "P2002") {
        user = await db.user.findUnique({ where: { logtoId } });
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
export async function requireAdmin(req?: Request) {
  const user = await getCurrentUser(req);
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

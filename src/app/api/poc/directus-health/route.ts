import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { pingDirectus, isDirectusConfigured } from "@/lib/directus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/poc/directus-health
 *
 * Verifies that the Directus server is reachable from Next.js.
 * Requires authentication (Logto) — this is NOT a public endpoint.
 *
 * Returns:
 *   { ok, configured, url, latencyMs, authUser, error? }
 */
export async function GET() {
  const user = await getCurrentUser();

  const configured = isDirectusConfigured();
  const result = await pingDirectus();

  return NextResponse.json({
    ok: result.ok,
    configured,
    url: result.url ? `${result.url}/server/ping` : "(not set)",
    latencyMs: result.latencyMs,
    authUser: {
      id: user.id,
      logtoId: user.logtoId || "(demo mode — no logtoId)",
      name: user.name,
      email: user.email,
    },
    error: result.error,
    timestamp: new Date().toISOString(),
  });
}

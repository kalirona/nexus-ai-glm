import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logAudit } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/user/api-keys — list the user's API keys (without the hashed key). */
export async function GET() {
  const user = await getCurrentUser();
  const keys = await db.apiKey.findMany({
    where: { userId: user.id, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      prefix: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });
  return NextResponse.json(keys);
}

/**
 * POST /api/user/api-keys — create a new API key.
 * Body: { name: string }
 * Returns: { id, name, prefix, key (plain text — shown ONCE), createdAt }
 *
 * The key is hashed with SHA-256 before storage. The plain-text key is only
 * returned once in the response — it is NEVER retrievable again.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  const body = (await req.json().catch(() => ({}))) as { name?: string };

  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (name.length > 60) return NextResponse.json({ error: "Name is too long (max 60 chars)" }, { status: 400 });

  // Generate a random API key: nexus_<32 hex chars>
  const rawBytes = new Uint8Array(24);
  crypto.getRandomValues(rawBytes);
  const hex = Array.from(rawBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  const plainKey = `nexus_${hex}`;
  const prefix = `nexus_${hex.slice(0, 8)}…`;

  // Hash with SHA-256 for storage
  const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(plainKey));
  const hashedKey = Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");

  const apiKey = await db.apiKey.create({
    data: {
      userId: user.id,
      name,
      hashedKey,
      prefix,
    },
    select: {
      id: true,
      name: true,
      prefix: true,
      createdAt: true,
    },
  });

  await logAudit(user.id, "api-key.create", "api-key", apiKey.id, { name });

  // Return the plain key ONCE — the client must show it and never store it
  return NextResponse.json({ ...apiKey, key: plainKey });
}

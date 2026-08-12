import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PLANS } from "@/lib/constants";
import { Webhook } from "svix";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/webhook — Clerk webhook handler with Svix signature verification.
 *
 * SECURITY:
 *   - When CLERK_WEBHOOK_SECRET is set: verifies Svix signature (production).
 *   - When CLERK_WEBHOOK_SECRET is NOT set: accepts unsigned requests (demo/dev only).
 *
 * Supported events:
 *   - user.created → create User with default plan + 200 credits
 *   - user.updated → update name, email, avatar only (NOT credits/plan/isAdmin)
 *   - user.deleted → soft delete (status = "banned", data preserved for audit)
 *
 * Idempotency: all operations use upsert or updateMany — safe to replay.
 *
 * Admin security: isAdmin is NEVER set from Clerk public_metadata.
 * Admin status can only be changed via:
 *   1. The admin PATCH /api/admin/users/:id endpoint (admin-only, audit-logged)
 *   2. Direct database access by a platform owner
 */

interface ClerkUser {
  id: string;
  email_addresses: Array<{ email_address: string }>;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  public_metadata: { isAdmin?: boolean; plan?: string };
}

interface ClerkEvent {
  type: string;
  data: ClerkUser;
}

export async function POST(req: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  let event: ClerkEvent;

  if (webhookSecret) {
    // Production mode — verify Svix signature
    const svixId = req.headers.get("svix-id");
    const svixTimestamp = req.headers.get("svix-timestamp");
    const svixSignature = req.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
    }

    const body = await req.text();
    const wh = new Webhook(webhookSecret);

    try {
      wh.verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      });
    } catch {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    try {
      event = JSON.parse(body) as ClerkEvent;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
  } else {
    // Demo/dev mode — no signature verification (sandbox only)
    try {
      event = (await req.json()) as ClerkEvent;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
  }

  const { type, data } = event;

  if (type === "user.created" || type === "user.updated") {
    const email = data.email_addresses?.[0]?.email_address;
    if (!email) {
      return NextResponse.json({ error: "No email found" }, { status: 400 });
    }

    const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || email.split("@")[0];

    // For user.created: use plan from metadata or default to "free"
    // For user.updated: do NOT overwrite credits, plan, isAdmin — only sync profile fields
    if (type === "user.created") {
      const plan = data.public_metadata?.plan || "free";
      const planCredits = PLANS.find((p) => p.id === plan)?.credits ?? 200;

      await db.user.upsert({
        where: { clerkId: data.id },
        update: {
          email,
          name,
          avatarUrl: data.image_url || null,
          // Do NOT update credits/plan/isAdmin on re-play
        },
        create: {
          clerkId: data.id,
          email,
          name,
          avatarUrl: data.image_url || null,
          plan,
          credits: planCredits,
          creditsResetAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
          // isAdmin is NEVER set from webhook — only via admin route or direct DB
        },
      });
    } else {
      // user.updated — only update safe profile fields
      // Do NOT update: credits, plan, isAdmin, status
      await db.user.updateMany({
        where: { clerkId: data.id },
        data: {
          email,
          name,
          avatarUrl: data.image_url || null,
        },
      });
    }

    return NextResponse.json({ ok: true, action: type });
  }

  if (type === "user.deleted") {
    // Soft delete — mark as banned so data is preserved for audit
    // Do NOT physically delete — preserves business data, audit trail, credit history
    await db.user.updateMany({
      where: { clerkId: data.id },
      data: { status: "banned" },
    });
    return NextResponse.json({ ok: true, action: "user.deleted" });
  }

  return NextResponse.json({ ok: true, action: "ignored", type });
}

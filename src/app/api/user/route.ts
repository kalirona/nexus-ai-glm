import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
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

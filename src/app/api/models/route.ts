import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getApprovedModels } from "@/lib/sync-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/models — returns ONLY admin-approved models for the model selector.
 * Users never see unapproved, disabled, or unverified models.
 */
export async function GET() {
  await getCurrentUser(); // any logged-in user can see approved models
  const models = await getApprovedModels();
  return NextResponse.json({ models });
}

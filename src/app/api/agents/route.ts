import { NextResponse } from "next/server";
import { AGENTS } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/agents — agent catalog. */
export async function GET() {
  return NextResponse.json(AGENTS);
}

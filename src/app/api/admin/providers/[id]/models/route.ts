import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { fetchProviderModels } from "@/lib/provider-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/providers/:id/models — fetch live models from the provider. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const { models, error } = await fetchProviderModels(id);

  if (error) {
    return NextResponse.json({ error, models: [] }, { status: 200 });
  }

  return NextResponse.json({ models, count: models.length });
}

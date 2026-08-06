import { NextResponse } from "next/server";
import { requireAdmin, logAudit } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PATCH /api/admin/models/registry/:id — approve, enable, set default, update metadata. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    approved?: boolean;
    enabled?: boolean;
    isDefault?: boolean;
    defaultCapability?: string | null;
    displayName?: string;
  };

  const existing = await db.aiModel.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Model not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  const actions: string[] = [];

  if (typeof body.approved === "boolean") {
    data.approved = body.approved;
    actions.push(`approved → ${body.approved}`);
  }

  if (typeof body.enabled === "boolean") {
    data.enabled = body.enabled;
    actions.push(`enabled → ${body.enabled}`);
  }

  if (typeof body.isDefault === "boolean") {
    if (body.isDefault) {
      // Unset other defaults for the same capability
      const cap = body.defaultCapability || existing.defaultCapability || "chat";
      await db.aiModel.updateMany({
        where: { defaultCapability: cap, isDefault: true, id: { not: id } },
        data: { isDefault: false, defaultCapability: null },
      });
      data.isDefault = true;
      data.defaultCapability = cap;
    } else {
      data.isDefault = false;
      data.defaultCapability = null;
    }
    actions.push(`default → ${body.isDefault}`);
  } else if (body.defaultCapability !== undefined) {
    data.defaultCapability = body.defaultCapability;
  }

  if (typeof body.displayName === "string" && body.displayName.trim()) {
    data.displayName = body.displayName.trim();
  }

  const updated = await db.aiModel.update({ where: { id }, data });
  await logAudit(admin.id, "admin.model.update", "ai-model", id, { actions: actions.join(", ") });

  return NextResponse.json(updated);
}

/** DELETE /api/admin/models/registry/:id — remove a model from the registry. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;

  const existing = await db.aiModel.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Model not found" }, { status: 404 });

  await db.aiModel.delete({ where: { id } });
  await logAudit(admin.id, "admin.model.delete", "ai-model", id, { modelId: existing.modelId });

  return new NextResponse(null, { status: 204 });
}

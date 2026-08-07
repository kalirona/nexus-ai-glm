import { NextResponse } from "next/server";
import { requireAdmin, logAudit } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PATCH /api/admin/prompts/:id — activate/deactivate or update content. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    isActive?: boolean;
    name?: string;
    content?: string;
  };

  const existing = await db.promptConfig.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Prompt not found" }, { status: 404 });

  const data: Record<string, unknown> = { updatedBy: admin.id };
  const actions: string[] = [];

  if (typeof body.isActive === "boolean") {
    if (body.isActive) {
      // Deactivate other active prompts for the same AI type
      await db.promptConfig.updateMany({
        where: { aiType: existing.aiType, isActive: true, id: { not: id } },
        data: { isActive: false },
      });
    }
    data.isActive = body.isActive;
    actions.push(`active → ${body.isActive}`);
  }

  if (typeof body.name === "string" && body.name.trim()) {
    data.name = body.name.trim();
  }

  if (typeof body.content === "string" && body.content.trim()) {
    data.content = body.content.trim();
    actions.push("content updated");
  }

  const updated = await db.promptConfig.update({ where: { id }, data });
  await logAudit(admin.id, "admin.prompt.update", "prompt", id, { actions: actions.join(", ") });

  return NextResponse.json(updated);
}

/** DELETE /api/admin/prompts/:id — delete a prompt version. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;

  const existing = await db.promptConfig.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Prompt not found" }, { status: 404 });

  await db.promptConfig.delete({ where: { id } });
  await logAudit(admin.id, "admin.prompt.delete", "prompt", id, {
    aiType: existing.aiType,
    version: existing.version,
  });

  return new NextResponse(null, { status: 204 });
}

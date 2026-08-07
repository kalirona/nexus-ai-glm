import { NextResponse } from "next/server";
import { requireAdmin, logAudit } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AI_TYPES = [
  "chat", "image", "document", "ocr", "speech-to-text", "text-to-speech",
  "code", "translation", "summarization", "custom",
];

/** GET /api/admin/prompts — list all prompt configs, grouped by AI type. */
export async function GET(req: Request) {
  await requireAdmin();
  const url = new URL(req.url);
  const aiType = url.searchParams.get("type");

  const where: Record<string, unknown> = {};
  if (aiType && aiType !== "all") where.aiType = aiType;

  const prompts = await db.promptConfig.findMany({
    where,
    orderBy: [{ aiType: "asc" }, { version: "desc" }],
  });

  return NextResponse.json({ prompts, aiTypes: AI_TYPES });
}

/** POST /api/admin/prompts — create a new prompt version. */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  const body = (await req.json().catch(() => ({}))) as {
    aiType: string;
    name: string;
    content: string;
  };

  if (!body.aiType || !AI_TYPES.includes(body.aiType)) {
    return NextResponse.json({ error: "Invalid AI type" }, { status: 400 });
  }
  if (!body.name?.trim() || !body.content?.trim()) {
    return NextResponse.json({ error: "Name and content are required" }, { status: 400 });
  }

  // Get the next version number for this AI type
  const lastVersion = await db.promptConfig.findFirst({
    where: { aiType: body.aiType },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const nextVersion = (lastVersion?.version ?? 0) + 1;

  // Deactivate previous active prompt for this AI type
  await db.promptConfig.updateMany({
    where: { aiType: body.aiType, isActive: true },
    data: { isActive: false },
  });

  const prompt = await db.promptConfig.create({
    data: {
      aiType: body.aiType,
      name: body.name.trim(),
      content: body.content.trim(),
      version: nextVersion,
      isActive: true,
      createdBy: admin.id,
      updatedBy: admin.id,
    },
  });

  await logAudit(admin.id, "admin.prompt.create", "prompt", prompt.id, {
    aiType: body.aiType,
    version: nextVersion,
  });

  return NextResponse.json(prompt, { status: 201 });
}

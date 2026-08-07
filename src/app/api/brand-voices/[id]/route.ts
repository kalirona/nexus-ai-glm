import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logAudit } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/brand-voices/:id */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const voice = await db.brandVoice.findFirst({ where: { id, userId: user.id } });
  if (!voice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(voice);
}

/** PATCH /api/brand-voices/:id */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    description?: string;
    tone?: string;
    vocabulary?: string;
    avoidWords?: string;
    sampleCopy?: string;
    isDefault?: boolean;
  };

  const existing = await db.brandVoice.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const name = body.name?.trim() ?? existing.name;
  const tone = body.tone?.trim() ?? existing.tone;
  const vocabulary = body.vocabulary ?? existing.vocabulary;
  const avoidWords = body.avoidWords ?? existing.avoidWords;
  const sampleCopy = body.sampleCopy ?? existing.sampleCopy;

  const systemPrompt = [
    `BRAND VOICE: ${name}`,
    `Tone: ${tone}.`,
    vocabulary?.trim() ? `Preferred vocabulary: ${vocabulary.trim()}.` : "",
    avoidWords?.trim() ? `Avoid these words/phrases: ${avoidWords.trim()}.` : "",
    sampleCopy?.trim() ? `Reference sample (match this style): """${sampleCopy.trim()}"""` : "",
    "Apply this voice consistently to every piece of content you generate.",
  ]
    .filter(Boolean)
    .join(" ");

  if (body.isDefault) {
    await db.brandVoice.updateMany({
      where: { userId: user.id, isDefault: true, id: { not: id } },
      data: { isDefault: false },
    });
  }

  const updated = await db.brandVoice.update({
    where: { id },
    data: {
      name,
      description: body.description !== undefined ? (body.description?.trim() || null) : existing.description,
      tone,
      vocabulary: vocabulary ?? null,
      avoidWords: avoidWords ?? null,
      sampleCopy: sampleCopy ?? null,
      systemPrompt,
      isDefault: body.isDefault !== undefined ? !!body.isDefault : existing.isDefault,
    },
  });

  await logAudit(user.id, "brand-voice.update", "brand-voice", id);
  return NextResponse.json(updated);
}

/** DELETE /api/brand-voices/:id */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const r = await db.brandVoice.deleteMany({ where: { id, userId: user.id } });
  if (r.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}

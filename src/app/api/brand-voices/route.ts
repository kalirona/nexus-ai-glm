import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logAudit } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/brand-voices — list the user's brand voice profiles. */
export async function GET() {
  const user = await getCurrentUser();
  const voices = await db.brandVoice.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      name: true,
      description: true,
      tone: true,
      vocabulary: true,
      avoidWords: true,
      sampleCopy: true,
      isDefault: true,
      updatedAt: true,
    },
  });
  return NextResponse.json(voices);
}

/** POST /api/brand-voices — create a brand voice profile. */
export async function POST(req: Request) {
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

  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const tone = body.tone?.trim() || "professional, confident";

  // Build the system prompt fragment that will be injected into generations
  const systemPrompt = buildVoicePrompt({
    name,
    tone,
    vocabulary: body.vocabulary,
    avoidWords: body.avoidWords,
    sampleCopy: body.sampleCopy,
  });

  // If marking as default, unset other defaults
  if (body.isDefault) {
    await db.brandVoice.updateMany({
      where: { userId: user.id, isDefault: true },
      data: { isDefault: false },
    });
  }

  const voice = await db.brandVoice.create({
    data: {
      userId: user.id,
      name,
      description: body.description?.trim() || null,
      tone,
      vocabulary: body.vocabulary?.trim() || null,
      avoidWords: body.avoidWords?.trim() || null,
      sampleCopy: body.sampleCopy?.trim() || null,
      systemPrompt,
      isDefault: !!body.isDefault,
    },
  });

  await logAudit(user.id, "brand-voice.create", "brand-voice", voice.id);
  return NextResponse.json(voice);
}

/** Builds the reusable system-prompt fragment that encodes a brand voice. */
export function buildVoicePrompt(v: {
  name: string;
  tone: string;
  vocabulary?: string;
  avoidWords?: string;
  sampleCopy?: string;
}): string {
  const parts: string[] = [`BRAND VOICE: ${v.name}`];
  parts.push(`Tone: ${v.tone}.`);
  if (v.vocabulary?.trim()) parts.push(`Preferred vocabulary: ${v.vocabulary.trim()}.`);
  if (v.avoidWords?.trim()) parts.push(`Avoid these words/phrases: ${v.avoidWords.trim()}.`);
  if (v.sampleCopy?.trim()) parts.push(`Reference sample (match this style): """${v.sampleCopy.trim()}"""`);
  parts.push("Apply this voice consistently to every piece of content you generate.");
  return parts.join(" ");
}

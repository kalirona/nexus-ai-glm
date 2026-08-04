import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, spendCredits, logAudit } from "@/lib/auth";
import { generateImage } from "@/lib/ai";
import { CREDIT_COSTS } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_SIZES = new Set([
  "1024x1024",
  "768x1344",
  "864x1152",
  "1344x768",
  "1152x864",
  "1440x720",
  "720x1440",
]);

/** POST /api/images/generate — generate an image and return base64. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  const body = (await req.json().catch(() => ({}))) as {
    prompt?: string;
    size?: string;
    kind?: string;
  };

  const prompt = body.prompt?.trim();
  if (!prompt) return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  const size = ALLOWED_SIZES.has(body.size || "") ? body.size! : "1024x1024";

  if (user.credits < CREDIT_COSTS.image) {
    return NextResponse.json(
      { error: "Not enough credits to generate an image." },
      { status: 402 }
    );
  }

  let base64: string;
  try {
    base64 = await generateImage(prompt, size);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Image generation failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
  if (!base64) {
    return NextResponse.json({ error: "Provider returned no image" }, { status: 502 });
  }

  const image = await db.image.create({
    data: {
      userId: user.id,
      prompt,
      size,
      base64,
      kind: body.kind || "graphic",
    },
  });

  await spendCredits(user.id, CREDIT_COSTS.image, "image", image.id);
  await logAudit(user.id, "image.generate", "image", image.id, { size, kind: body.kind });

  const refreshed = await db.user.findUnique({
    where: { id: user.id },
    select: { credits: true },
  });

  return NextResponse.json({
    image: {
      id: image.id,
      prompt: image.prompt,
      size: image.size,
      kind: image.kind,
      base64,
      createdAt: image.createdAt.toISOString(),
    },
    credits: refreshed?.credits ?? 0,
  });
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, spendCredits, logAudit } from "@/lib/auth";
import { chatCompletion } from "@/lib/ai";
import { TEMPLATES, CREDIT_COSTS } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/documents/generate — generate a document from a template. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  const body = (await req.json().catch(() => ({}))) as {
    templateKey: string;
    fields: Record<string, string>;
    title?: string;
  };

  if (!body.templateKey) {
    return NextResponse.json({ error: "templateKey is required" }, { status: 400 });
  }
  const template = TEMPLATES.find((t) => t.key === body.templateKey);
  if (!template) {
    return NextResponse.json({ error: "Unknown template" }, { status: 400 });
  }

  if (user.credits < CREDIT_COSTS.document) {
    return NextResponse.json(
      { error: "Not enough credits to generate a document." },
      { status: 402 }
    );
  }

  // Fill the user prompt template
  let userPrompt = template.userPromptTpl;
  for (const [k, v] of Object.entries(body.fields || {})) {
    userPrompt = userPrompt.replaceAll(`{${k}}`, v || "");
  }

  const content = await chatCompletion(
    [
      { role: "system", content: template.systemPrompt },
      { role: "user", content: userPrompt },
    ],
    "auto"
  );

  const title =
    body.title?.trim() ||
    `${template.name} — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  const doc = await db.document.create({
    data: {
      userId: user.id,
      title,
      content,
      kind: template.kind,
      tags: template.category,
    },
  });
  await db.documentVersion.create({
    data: { documentId: doc.id, content, version: 1 },
  });

  await spendCredits(user.id, CREDIT_COSTS.document, "document", doc.id);
  await logAudit(user.id, "document.generate", "document", doc.id, { template: template.key });

  const refreshed = await db.user.findUnique({
    where: { id: user.id },
    select: { credits: true },
  });

  return NextResponse.json({
    document: {
      id: doc.id,
      title: doc.title,
      content: doc.content,
      kind: doc.kind,
      updatedAt: doc.updatedAt.toISOString(),
      createdAt: doc.createdAt.toISOString(),
    },
    credits: refreshed?.credits ?? 0,
  });
}

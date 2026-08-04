import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/chats — list chats (pinned first, then recent). */
export async function GET() {
  const user = await getCurrentUser();
  const chats = await db.chat.findMany({
    where: { userId: user.id, archived: false },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      model: true,
      pinned: true,
      folderId: true,
      updatedAt: true,
    },
    take: 100,
  });
  return NextResponse.json(chats);
}

/** POST /api/chats — create an empty chat. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  const { title, model } = (await req.json().catch(() => ({}))) as {
    title?: string;
    model?: string;
  };
  const chat = await db.chat.create({
    data: {
      userId: user.id,
      title: title?.trim() || "New chat",
      model: model || "auto",
    },
  });
  return NextResponse.json(chat);
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();

  const [chats, documents, images, transactions, logs, chatCount, docCount, imgCount] = await Promise.all([
    db.chat.findMany({
      where: { userId: user.id, archived: false },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, title: true, model: true, updatedAt: true, pinned: true },
    }),
    db.document.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 4,
      select: { id: true, title: true, kind: true, updatedAt: true },
    }),
    db.image.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, prompt: true, size: true, kind: true, createdAt: true },
    }),
    db.creditTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: { id: true, amount: true, reason: true, createdAt: true },
    }),
    db.auditLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, action: true, resource: true, createdAt: true },
    }),
    db.chat.count({ where: { userId: user.id, archived: false } }),
    db.document.count({ where: { userId: user.id } }),
    db.image.count({ where: { userId: user.id } }),
  ]);

  const days: { label: string; chat: number; image: number; document: number }[] = [];
  const dayMs = 24 * 60 * 60 * 1000;
  for (let i = 6; i >= 0; i--) {
    const start = new Date(new Date().setHours(0, 0, 0, 0) - i * dayMs);
    const end = new Date(start.getTime() + dayMs);
    const dayTx = transactions.filter(
      (t) => new Date(t.createdAt) >= start && new Date(t.createdAt) < end
    );
    days.push({
      label: start.toLocaleDateString("en-US", { weekday: "short" }),
      chat: dayTx.filter((t) => t.reason === "chat").reduce((a, t) => a + Math.abs(t.amount), 0),
      image: dayTx.filter((t) => t.reason === "image").reduce((a, t) => a + Math.abs(t.amount), 0),
      document: dayTx.filter((t) => t.reason === "document").reduce((a, t) => a + Math.abs(t.amount), 0),
    });
  }

  const creditsUsed = transactions
    .filter((t) => t.amount < 0)
    .reduce((a, t) => a + Math.abs(t.amount), 0);

  return NextResponse.json({
    user: { id: user.id, name: user.name, plan: user.plan, credits: user.credits },
    counts: { chats: chatCount, documents: docCount, images: imgCount },
    series: days,
    creditsUsed,
    recent: { chats, documents, images, logs },
  });
}

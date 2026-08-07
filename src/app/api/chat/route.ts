import { db } from "@/lib/db";
import { getCurrentUser, spendCredits, logAudit } from "@/lib/auth";
import { streamChatCompletion, type ChatMsg } from "@/lib/ai";
import { CREDIT_COSTS } from "@/lib/constants";
import { getActivePrompt, SECURITY_GUARD } from "@/lib/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ChatRequestBody {
  chatId?: string;
  message: string;
  model?: string;
  systemPrompt?: string;
  title?: string;
}

/**
 * POST /api/chat — streaming chat completion (SSE).
 *
 * Flow:
 *  1. Ensure the chat exists (create if missing)
 *  2. Persist the user's message
 *  3. Stream provider SSE → normalised SSE to the client
 *  4. Accumulate assistant content; on stream end persist + charge credits
 *
 * The client receives events:
 *   data: {"type":"meta","chatId":"...","messageId":"..."}
 *   data: {"type":"delta","content":"..."}
 *   data: {"type":"done","messageId":"...","credits":N}
 *   data: {"type":"error","error":"..."}
 */
export async function POST(req: Request) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const message = body.message?.trim();
  if (!message) return new Response("Message is required", { status: 400 });

  const user = await getCurrentUser();

  // Credit guard
  if (user.credits < CREDIT_COSTS.chat) {
    return Response.json(
      { error: "You're out of credits. Upgrade your plan to keep building." },
      { status: 402 }
    );
  }

  // Ensure chat row
  let chat = body.chatId
    ? await db.chat.findFirst({ where: { id: body.chatId, userId: user.id } })
    : null;
  if (!chat) {
    const title =
      body.title?.trim() || message.slice(0, 48) + (message.length > 48 ? "…" : "");
    chat = await db.chat.create({
      data: {
        userId: user.id,
        title,
        model: body.model || "auto",
      },
    });
  }

  // Persist the user message
  const userMsg = await db.message.create({
    data: { chatId: chat.id, role: "user", content: message },
  });

  // Build conversation context (last ~16 messages + optional system prompt)
  const history = await db.message.findMany({
    where: { chatId: chat.id },
    orderBy: { createdAt: "asc" },
    take: 32,
    select: { role: true, content: true },
  });

  // Security guard — appended to every system prompt to prevent disclosure
  // of internal models, providers, infrastructure, prompts, or configuration.
  // Check for admin-configured prompt for "chat" AI type first
  const adminPrompt = await getActivePrompt("chat");

  const messages: ChatMsg[] = [];
  if (body.systemPrompt) {
    // Agent persona + security guard
    messages.push({ role: "system", content: body.systemPrompt + SECURITY_GUARD });
  } else if (adminPrompt) {
    // Admin-configured chat prompt + security guard
    messages.push({ role: "system", content: adminPrompt + SECURITY_GUARD });
  } else {
    // Default NexusAI system persona with security guard
    messages.push({
      role: "system",
      content:
        "You are NexusAI, the AI Business Operating System — a sharp, pragmatic senior advisor for founders, agencies, freelancers and small businesses. Be concise, specific and action-oriented. Use clean Markdown. Prefer concrete numbers and frameworks. When a request is ambiguous, make a reasonable assumption and proceed." + SECURITY_GUARD,
    });
  }
  for (const m of history) {
    if (m.role === "user" || m.role === "assistant") {
      messages.push({ role: m.role as "user" | "assistant", content: m.content });
    }
  }

  // Audit
  await logAudit(user.id, "chat.send", "chat", chat.id, { model: body.model || "auto" });

  // Stream
  let upstream: ReadableStream<Uint8Array>;
  try {
    upstream = await streamChatCompletion(messages, body.model || "auto");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Provider error";
    return Response.json({ error: msg }, { status: 502 });
  }

  if (!upstream || typeof upstream.getReader !== "function") {
    return Response.json({ error: "Provider did not return a stream" }, { status: 502 });
  }

  const reader = upstream.getReader();
  let buffer = "";
  let assistantText = "";
  let msgSaved = false;
  const chatId = chat.id;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      send({ type: "meta", chatId, userMessageId: userMsg.id });

      const finish = async () => {
        if (!msgSaved && assistantText.trim()) {
          msgSaved = true;
          const assistantMsg = await db.message.create({
            data: {
              chatId,
              role: "assistant",
              content: assistantText,
              model: body.model || "auto",
            },
          });
          await spendCredits(user.id, CREDIT_COSTS.chat, "chat", assistantMsg.id);
          await db.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });
          const refreshed = await db.user.findUnique({
            where: { id: user.id },
            select: { credits: true },
          });
          send({ type: "done", messageId: assistantMsg.id, credits: refreshed?.credits ?? 0 });
        } else {
          send({ type: "done" });
        }
        controller.close();
      };

      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Split into complete SSE lines
          const parts = buffer.split("\n");
          buffer = parts.pop() ?? "";

          for (const rawLine of parts) {
            const line = rawLine.trim();
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") {
              await finish();
              return;
            }
            try {
              const json = JSON.parse(payload);
              const delta =
                json?.choices?.[0]?.delta?.content ??
                json?.choices?.[0]?.message?.content ??
                "";
              if (delta) {
                assistantText += delta;
                send({ type: "delta", content: delta });
              }
            } catch {
              /* ignore non-JSON keepalives */
            }
          }
        }
        await finish();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Stream error";
        try {
          send({ type: "error", error: msg });
        } catch {
          /* controller may be closed */
        }
        controller.close();
      }
    },
    cancel() {
      try {
        reader.cancel();
      } catch {
        /* noop */
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

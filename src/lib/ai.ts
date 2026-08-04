import ZAI from "z-ai-web-dev-sdk";

/**
 * AI provider abstraction (Service Layer).
 *
 * The entire platform must never hardcode provider calls in feature code.
 * Every feature talks to `ai` — the underlying provider (z-ai-web-dev-sdk)
 * can be swapped without touching call sites.
 */

let instance: ZAI | null = null;

export async function getAI(): Promise<ZAI> {
  if (!instance) {
    instance = await ZAI.create();
  }
  return instance;
}

/** Chat message shape understood across the app. */
export interface ChatMsg {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Run a chat completion that streams server-sent events.
 * Returns a ReadableStream of raw SSE bytes from the provider so the API
 * route can proxy it straight to the client.
 */
export async function streamChatCompletion(messages: ChatMsg[], model?: string) {
  const zai = await getAI();
  const body: Record<string, unknown> = {
    messages,
    stream: true,
    thinking: { type: "disabled" },
  };
  if (model && model !== "auto") body.model = model;

  const result = await zai.chat.completions.create(body as never);
  // Provider returns a web ReadableStream when stream:true
  return result as ReadableStream<Uint8Array>;
}

/** Non-streaming completion — used for document generation. */
export async function chatCompletion(messages: ChatMsg[], model?: string): Promise<string> {
  const zai = await getAI();
  const body: Record<string, unknown> = {
    messages,
    thinking: { type: "disabled" },
  };
  if (model && model !== "auto") body.model = model;

  const completion = await zai.chat.completions.create(body as never);
  const data = completion as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}

/** Generate an image, returning base64. */
export async function generateImage(prompt: string, size: string): Promise<string> {
  const zai = await getAI();
  const res = await zai.images.generations.create({ prompt, size: size as never });
  return res.data[0]?.base64 ?? "";
}

import ZAI from "z-ai-web-dev-sdk";
import { resolveKeyForRole } from "@/lib/settings";

/**
 * AI provider abstraction (Service Layer).
 *
 * The entire platform must never hardcode provider calls in feature code.
 * Every feature talks to `ai` — the underlying provider can be swapped
 * without touching call sites.
 *
 * Key resolution: admin-configured API keys (with role: chat | image | all)
 * take priority. If no key is configured, fall back to the SDK which reads
 * from the environment.
 */

let sdkInstance: ZAI | null = null;

async function getSDK(): Promise<ZAI> {
  if (!sdkInstance) {
    sdkInstance = await ZAI.create();
  }
  return sdkInstance;
}

/** Chat message shape understood across the app. */
export interface ChatMsg {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Run a chat completion that streams server-sent events.
 * Uses the admin-configured chat key if available, otherwise the SDK.
 */
export async function streamChatCompletion(messages: ChatMsg[], model?: string) {
  const keyConfig = await resolveKeyForRole("chat");

  if (keyConfig) {
    // Use raw fetch with the admin-configured key + base URL
    const body: Record<string, unknown> = {
      messages,
      stream: true,
      thinking: { type: "disabled" },
    };
    if (model && model !== "auto") body.model = model;

    const res = await fetch(`${keyConfig.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${keyConfig.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Chat API failed (${res.status}): ${errText.slice(0, 200)}`);
    }
    if (!res.body) throw new Error("No response stream");
    return res.body as ReadableStream<Uint8Array>;
  }

  // Fallback to SDK (reads key from env)
  const zai = await getSDK();
  const body: Record<string, unknown> = {
    messages,
    stream: true,
    thinking: { type: "disabled" },
  };
  if (model && model !== "auto") body.model = model;

  const result = await zai.chat.completions.create(body as never);
  return result as ReadableStream<Uint8Array>;
}

/** Non-streaming completion — used for document generation. */
export async function chatCompletion(messages: ChatMsg[], model?: string): Promise<string> {
  const keyConfig = await resolveKeyForRole("chat");

  if (keyConfig) {
    const body: Record<string, unknown> = {
      messages,
      thinking: { type: "disabled" },
    };
    if (model && model !== "auto") body.model = model;

    const res = await fetch(`${keyConfig.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${keyConfig.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Chat API failed (${res.status}): ${errText.slice(0, 200)}`);
    }
    const data = await res.json();
    return (data as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content ?? "";
  }

  // Fallback to SDK
  const zai = await getSDK();
  const body: Record<string, unknown> = {
    messages,
    thinking: { type: "disabled" },
  };
  if (model && model !== "auto") body.model = model;

  const completion = await zai.chat.completions.create(body as never);
  const data = completion as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}

/** Generate an image, returning base64. Uses the image-role key if available. */
export async function generateImage(prompt: string, size: string): Promise<string> {
  const keyConfig = await resolveKeyForRole("image");

  if (keyConfig) {
    const res = await fetch(`${keyConfig.baseUrl}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${keyConfig.apiKey}`,
      },
      body: JSON.stringify({ prompt, size, n: 1 }),
      signal: AbortSignal.timeout(120000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Image API failed (${res.status}): ${errText.slice(0, 200)}`);
    }
    const data = await res.json();
    const base64 = (data as { data?: { b64_json?: string; base64?: string }[] }).data?.[0];
    return base64?.b64_json || base64?.base64 || "";
  }

  // Fallback to SDK
  const zai = await getSDK();
  const res = await zai.images.generations.create({ prompt, size: size as never });
  return res.data[0]?.base64 ?? "";
}

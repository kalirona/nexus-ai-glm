import ZAI from "z-ai-web-dev-sdk";
import { resolveKeyForRole, getSetting } from "@/lib/settings";
import { logAiUsage } from "@/lib/provider-service";

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
 * Resolves the model to use when "auto" is specified.
 * Checks the admin-configured defaultModels.chat, then falls back to null
 * (which means don't send a model field — let the SDK/provider pick).
 */
async function resolveAutoModel(keyConfig: { baseUrl: string } | null): Promise<string | null> {
  // If using the SDK (no keyConfig), "auto" is fine — the SDK handles it
  if (!keyConfig) return null;

  // Check admin-configured default model for chat
  const defaultModels = await getSetting<Record<string, string>>("defaultModels", {});
  if (defaultModels.chat) return defaultModels.chat;

  // No default configured — the provider will need a model.
  // Return null to signal "use SDK instead" for "auto" routing.
  return null;
}

/**
 * Run a chat completion that streams server-sent events.
 * Uses the admin-configured chat key if available, otherwise the SDK.
 * When model is "auto" and a configured key is used, resolves to the
 * admin-configured default chat model. If no default is set, falls back
 * to the SDK which handles "auto" natively.
 */
export async function streamChatCompletion(messages: ChatMsg[], model?: string) {
  const keyConfig = await resolveKeyForRole("chat");
  const isAuto = !model || model === "auto";

  // When using "auto" with a configured key, resolve to a real model.
  // If no default is configured, fall back to the SDK (which handles "auto").
  if (keyConfig && isAuto) {
    const resolvedModel = await resolveAutoModel(keyConfig);
    if (!resolvedModel) {
      // No default model configured — use SDK for "auto" routing
      const zai = await getSDK();
      const result = await zai.chat.completions.create({
        messages,
        stream: true,
        thinking: { type: "disabled" },
      } as never);
      return result as ReadableStream<Uint8Array>;
    }
    model = resolvedModel;
  }

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
  const start = Date.now();
  const isAuto = !model || model === "auto";
  const provider = keyConfig ? "configured" : "zai-sdk";

  try {
    // When using "auto" with a configured key, resolve to a real model.
    // If no default is configured, fall back to the SDK.
    if (keyConfig && isAuto) {
      const defaultModels = await getSetting<Record<string, string>>("defaultModels", {});
      if (defaultModels.chat) {
        model = defaultModels.chat;
      } else {
        // No default — use SDK for "auto" routing
        const zai = await getSDK();
        const completion = await zai.chat.completions.create({
          messages,
          thinking: { type: "disabled" },
        } as never);
        const data = completion as { choices?: { message?: { content?: string } }[] };
        await logAiUsage({
          provider: "zai-sdk",
          model: "auto",
          requestType: "document",
          durationMs: Date.now() - start,
          success: true,
        });
        return data.choices?.[0]?.message?.content ?? "";
      }
    }

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
      const data = await res.json() as { choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } };
      await logAiUsage({
        provider,
        model: model || "auto",
        requestType: "document",
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens,
        durationMs: Date.now() - start,
        success: true,
      });
      return data.choices?.[0]?.message?.content ?? "";
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
    await logAiUsage({
      provider: "zai-sdk",
      model: model || "auto",
      requestType: "document",
      durationMs: Date.now() - start,
      success: true,
    });
    return data.choices?.[0]?.message?.content ?? "";
  } catch (err) {
    await logAiUsage({
      provider,
      model: model || "auto",
      requestType: "document",
      durationMs: Date.now() - start,
      success: false,
      errorMessage: err instanceof Error ? err.message.slice(0, 200) : "Unknown error",
    });
    throw err;
  }
}

/** Generate an image, returning base64. Uses the image-role key if available. */
export async function generateImage(prompt: string, size: string): Promise<string> {
  const keyConfig = await resolveKeyForRole("image");
  const start = Date.now();

  try {
    // Only use the configured key if the provider supports image generation.
    // OpenRouter and most non-Z.ai providers don't support /images/generations.
    // Check if the configured baseUrl is a Z.ai endpoint (which supports images).
    const isZaiEndpoint = keyConfig?.baseUrl?.includes("api.z.ai") || keyConfig?.baseUrl?.includes("z.ai");

    if (keyConfig && isZaiEndpoint) {
      // Z.ai supports image generation — use the configured key
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
      await logAiUsage({
        provider: "configured",
        model: "image-generation",
        requestType: "image",
        durationMs: Date.now() - start,
        success: true,
      });
      return base64?.b64_json || base64?.base64 || "";
    }

    // For non-Z.ai providers (OpenRouter, OpenAI, etc.) or when no key is configured,
    // fall back to the SDK which uses Z.ai's built-in image generation.
    const zai = await getSDK();
    const res = await zai.images.generations.create({ prompt, size: size as never });
    await logAiUsage({
      provider: "zai-sdk",
      model: "image-generation",
      requestType: "image",
      durationMs: Date.now() - start,
      success: true,
    });
    return res.data[0]?.base64 ?? "";
  } catch (err) {
    await logAiUsage({
      provider: keyConfig ? "configured" : "zai-sdk",
      model: "image-generation",
      requestType: "image",
      durationMs: Date.now() - start,
      success: false,
      errorMessage: err instanceof Error ? err.message.slice(0, 200) : "Unknown error",
    });
    throw err;
  }
}

/**
 * Server-only Groq client (https://groq.com — the inference API, not xAI's Grok).
 *
 * The API key is read from process.env.GROQ_API_KEY at request time. It is never
 * exposed to the browser: this module is only imported by route handlers under /app/api.
 */
import type { ApiErrorBody } from "../types";

if (typeof window !== "undefined") {
  throw new Error("lib/server/groq must never be imported in the browser");
}

const GROQ_URL = process.env.GROQ_BASE_URL?.replace(/\/$/, "") ?? "https://api.groq.com/openai/v1";
export const DEFAULT_MODEL = "openai/gpt-oss-120b";
const TIMEOUT_MS = 25_000;

export class GroqError extends Error {
  constructor(
    public code: ApiErrorBody["code"],
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export function getModel(): string {
  return process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL;
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

interface ChatOptions {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}

async function requestOnce(opts: ChatOptions, apiKey: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const model = getModel();
  let res: Response;
  try {
    res = await fetch(`${GROQ_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: opts.temperature ?? 0.4,
        max_tokens: opts.maxTokens ?? 2000,
        response_format: { type: "json_object" },
        // gpt-oss reasoning tokens count toward max_tokens; keep them short so the JSON isn't cut off.
        ...(model.startsWith("openai/gpt-oss") && { reasoning_effort: "low" }),
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
      }),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new GroqError("timeout", "The AI service took too long to respond. Try again in a moment.", 504);
    }
    throw new GroqError("upstream_error", "Couldn't reach the AI service. Check your connection and try again.", 502);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    // Log status and Groq's error message only — never log request bodies (they contain the user's answer).
    const errBody = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    console.error(`[groq] HTTP ${res.status}: ${errBody?.error?.message ?? "no message"}`);
    if (res.status === 401 || res.status === 403) {
      throw new GroqError("upstream_error", "The AI service rejected the server's API key. Check GROQ_API_KEY in your environment variables.", 502);
    }
    if (res.status === 429) {
      throw new GroqError("rate_limited", "The AI service is busy right now (rate limit reached). Wait a minute and try again.", 429);
    }
    if (res.status === 400 || res.status === 404) {
      throw new GroqError("upstream_error", "The AI service couldn't process this request. If you changed GROQ_MODEL, check the model name.", 502);
    }
    throw new GroqError("upstream_error", "The AI service returned an error. Try again shortly.", 502);
  }

  const json = (await res.json().catch(() => null)) as { choices?: { message?: { content?: string } }[] } | null;
  const content = json?.choices?.[0]?.message?.content;
  if (!content) throw new GroqError("bad_ai_response", "The AI service returned an empty response. Try again.", 502);
  return content;
}

function extractJson(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(content.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    return undefined;
  }
}

/** Calls Groq in JSON mode and returns the parsed object. Retries once if the output isn't valid JSON. */
export async function chatJson(opts: ChatOptions): Promise<unknown> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new GroqError(
      "missing_key",
      "AI feedback isn't set up yet: the server has no GROQ_API_KEY. Add it to .env.local (local) or your Vercel environment variables.",
      503,
    );
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    const content = await requestOnce(opts, apiKey);
    const parsed = extractJson(content);
    if (parsed !== undefined) return parsed;
  }
  throw new GroqError("bad_ai_response", "The AI response couldn't be read. Try again.", 502);
}

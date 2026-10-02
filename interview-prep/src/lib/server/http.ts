import { NextResponse } from "next/server";
import type { ApiErrorBody } from "../types";

/**
 * Best-effort, in-memory rate limiting per client IP. On Vercel each warm function instance
 * keeps its own counter, so this is a guard against accidental loops and casual abuse —
 * not a hard quota. Groq's own rate limits still apply.
 */
const WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

export function rateLimit(req: Request, limit: number, bucket: string): boolean {
  const ip = (req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "local").trim();
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return true;
}

/** Rejects cross-site browser requests so other websites can't spend this deployment's AI quota. */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin fetches from some browsers / server tools omit Origin
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function errorResponse(status: number, code: ApiErrorBody["code"], error: string) {
  return NextResponse.json<ApiErrorBody>({ error, code }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function readJson(req: Request, maxBytes: number): Promise<unknown> {
  const text = await req.text();
  if (text.length > maxBytes) throw new Error("too_large");
  return JSON.parse(text);
}

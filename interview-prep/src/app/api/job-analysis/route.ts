import { NextResponse } from "next/server";
import { chatJson, GroqError } from "@/lib/server/groq";
import { errorResponse, isSameOrigin, rateLimit, readJson } from "@/lib/server/http";
import { buildJobUserPrompt, JOB_SYSTEM } from "@/lib/server/prompts";
import { sanitizeJobAnalysis } from "@/lib/validate";
import type { JobAnalysis, JobAnalysisRequest } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function validate(body: unknown): JobAnalysisRequest | string {
  if (typeof body !== "object" || body === null) return "Request body must be a JSON object.";
  const b = body as Record<string, unknown>;
  const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const description = typeof b.description === "string" ? b.description.trim() : "";
  if (description.length < 80) return "Paste more of the job description (at least a few sentences) for a useful analysis.";
  if (description.length > 15000) return "The job description is too long (15,000 characters max). Remove boilerplate like benefits or legal text.";
  return { company: s(b.company, 120), role: s(b.role, 120), description };
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return errorResponse(403, "invalid_input", "Cross-site requests aren't allowed.");
  if (!rateLimit(req, 8, "job")) {
    return errorResponse(429, "rate_limited", "Too many analyses in the last minute. Wait a moment and try again.");
  }
  let body: unknown;
  try {
    body = await readJson(req, 40_000);
  } catch {
    return errorResponse(400, "invalid_input", "The request couldn't be read.");
  }
  const parsed = validate(body);
  if (typeof parsed === "string") return errorResponse(400, "invalid_input", parsed);

  try {
    const raw = await chatJson({ system: JOB_SYSTEM, user: buildJobUserPrompt(parsed), temperature: 0.3, maxTokens: 2500 });
    const analysis = sanitizeJobAnalysis({ ...(raw as object), source: "ai", analyzedAt: new Date().toISOString() });
    if (!analysis || analysis.suggestedQuestions.length === 0) {
      return errorResponse(502, "bad_ai_response", "The AI response was incomplete. Try again.");
    }
    return NextResponse.json<{ analysis: JobAnalysis }>({ analysis }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof GroqError) return errorResponse(err.status, err.code, err.message);
    console.error("[api/job-analysis] unexpected error", err instanceof Error ? err.message : err);
    return errorResponse(500, "server_error", "Something went wrong on the server. Try again.");
  }
}

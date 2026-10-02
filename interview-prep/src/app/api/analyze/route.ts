import { NextResponse } from "next/server";
import { ANALYZE_LIMITS } from "@/lib/ai-client";
import { isCategoryId } from "@/lib/categories";
import { normalizeFeedback } from "@/lib/feedback-schema";
import { chatJson, getModel, GroqError } from "@/lib/server/groq";
import { errorResponse, isSameOrigin, rateLimit, readJson } from "@/lib/server/http";
import { ANALYZE_SYSTEM, buildAnalyzeUserPrompt } from "@/lib/server/prompts";
import type { AnalyzeRequest, AnalyzeResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const LIMITS = ANALYZE_LIMITS;

function validate(body: unknown): AnalyzeRequest | string {
  if (typeof body !== "object" || body === null) return "Request body must be a JSON object.";
  const b = body as Record<string, unknown>;
  const question = typeof b.question === "string" ? b.question.trim() : "";
  const answer = typeof b.answer === "string" ? b.answer.trim() : "";
  if (!question || question.length > LIMITS.questionMax) return "A question (up to 500 characters) is required.";
  if (answer.length < LIMITS.answerMin) return "Write a little more before analysing: at least a couple of sentences.";
  if (answer.length > LIMITS.answerMax) return "This answer is too long to analyse (6,000 characters max). Trim it and try again.";
  if (!isCategoryId(b.category)) return "Unknown question category.";
  const opt = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, LIMITS.contextMax) : undefined);
  return { question, answer, category: b.category, role: opt(b.role), company: opt(b.company) };
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return errorResponse(403, "invalid_input", "Cross-site requests aren't allowed.");
  if (!rateLimit(req, 20, "analyze")) {
    return errorResponse(429, "rate_limited", "You've requested a lot of feedback in the last minute. Wait a moment and try again.");
  }

  let body: unknown;
  try {
    body = await readJson(req, 20_000);
  } catch {
    return errorResponse(400, "invalid_input", "The request couldn't be read.");
  }
  const parsed = validate(body);
  if (typeof parsed === "string") return errorResponse(400, "invalid_input", parsed);

  try {
    const raw = await chatJson({ system: ANALYZE_SYSTEM, user: buildAnalyzeUserPrompt(parsed), temperature: 0.4, maxTokens: 2200 });
    const feedback = normalizeFeedback(raw);
    if (!feedback) return errorResponse(502, "bad_ai_response", "The AI response was incomplete. Try again.");
    return NextResponse.json<AnalyzeResponse>({ feedback, model: getModel() }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof GroqError) return errorResponse(err.status, err.code, err.message);
    console.error("[api/analyze] unexpected error", err instanceof Error ? err.message : err);
    return errorResponse(500, "server_error", "Something went wrong on the server. Try again.");
  }
}

export function GET() {
  return errorResponse(405, "invalid_input", "Use POST to analyse an answer.");
}

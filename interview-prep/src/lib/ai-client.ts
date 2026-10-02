/**
 * Browser → our own API routes. The browser never talks to Groq directly and never sees the key.
 * Only the specific answer (plus its question, category and optional role/company) is sent.
 */
import { normalizeFeedback } from "./feedback-schema";
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  ApiErrorBody,
  JobAnalysis,
  JobAnalysisRequest,
  StoredFeedback,
} from "./types";
import { sanitizeJobAnalysis } from "./validate";

export const ANALYZE_LIMITS = { questionMax: 500, answerMin: 20, answerMax: 6000, contextMax: 120 } as const;

export class AiRequestError extends Error {
  constructor(
    public code: ApiErrorBody["code"] | "network",
    message: string,
  ) {
    super(message);
  }
}

async function postJson<T>(url: string, body: unknown, timeoutMs = 40_000): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new AiRequestError("network", "You're offline. AI feedback needs an internet connection; your answer is still saved.");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new AiRequestError("timeout", "The request took too long. Try again.");
    }
    throw new AiRequestError("network", "Couldn't reach the server. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }
  const json = (await res.json().catch(() => null)) as (T & Partial<ApiErrorBody>) | null;
  if (!res.ok || !json) {
    throw new AiRequestError(json?.code ?? "server_error", json?.error ?? `The server returned an error (${res.status}).`);
  }
  return json;
}

export async function analyzeAnswer(req: AnalyzeRequest): Promise<StoredFeedback> {
  const answer = req.answer.trim();
  if (answer.length < ANALYZE_LIMITS.answerMin) {
    throw new AiRequestError("invalid_input", "Write a little more before analysing: at least a couple of sentences.");
  }
  if (answer.length > ANALYZE_LIMITS.answerMax) {
    throw new AiRequestError("invalid_input", "This answer is too long to analyse (6,000 characters max).");
  }
  // Explicitly whitelist fields so nothing else from local state can leak into the request.
  const payload: AnalyzeRequest = {
    question: req.question.slice(0, ANALYZE_LIMITS.questionMax),
    category: req.category,
    answer,
    ...(req.role ? { role: req.role.slice(0, ANALYZE_LIMITS.contextMax) } : {}),
    ...(req.company ? { company: req.company.slice(0, ANALYZE_LIMITS.contextMax) } : {}),
  };
  const res = await postJson<AnalyzeResponse>("/api/analyze", payload);
  const feedback = normalizeFeedback(res.feedback);
  if (!feedback) throw new AiRequestError("bad_ai_response", "The AI response was incomplete. Try again.");
  return { ...feedback, analyzedAt: new Date().toISOString(), answerSnapshot: answer, model: res.model };
}

export async function analyzeJobDescription(req: JobAnalysisRequest): Promise<JobAnalysis> {
  const res = await postJson<{ analysis: JobAnalysis }>("/api/job-analysis", {
    company: req.company,
    role: req.role,
    description: req.description,
  }, 45_000);
  const analysis = sanitizeJobAnalysis(res.analysis);
  if (!analysis) throw new AiRequestError("bad_ai_response", "The AI response was incomplete. Try again.");
  return { ...analysis, source: "ai" };
}

/* ---------- AI availability ---------- */

export interface AiStatus {
  aiConfigured: boolean;
  model: string | null;
}

let statusPromise: Promise<AiStatus> | null = null;

export function fetchAiStatus(): Promise<AiStatus> {
  if (!statusPromise) {
    statusPromise = fetch("/api/status", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<AiStatus>) : { aiConfigured: false, model: null }))
      .catch(() => {
        statusPromise = null; // allow retry later
        return { aiConfigured: false, model: null };
      });
  }
  return statusPromise;
}

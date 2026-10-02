"use client";

import { useState } from "react";
import { AlertCircle, RotateCw, ShieldCheck, Sparkles } from "lucide-react";
import { AiRequestError, analyzeAnswer, ANALYZE_LIMITS } from "@/lib/ai-client";
import type { CategoryId, StoredFeedback } from "@/lib/types";
import { useStore } from "@/lib/store";
import { useAiStatus } from "@/lib/use-ai-status";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { FeedbackPanel } from "./FeedbackPanel";

export function AnalyzePanel({
  question,
  category,
  answer,
  role,
  company,
  feedback,
  onFeedback,
  onUseSuggested,
  buttonLabel = "Analyse answer",
}: {
  question: string;
  category: CategoryId;
  answer: string;
  role?: string;
  company?: string;
  feedback: StoredFeedback | null;
  onFeedback: (fb: StoredFeedback) => void;
  onUseSuggested?: (text: string) => void;
  buttonLabel?: string;
}) {
  const status = useAiStatus();
  const { data } = useStore();
  const effectiveRole = role || data.settings.targetRole || undefined;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tooShort = answer.trim().length < ANALYZE_LIMITS.answerMin;

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const fb = await analyzeAnswer({ question, category, answer, role: effectiveRole, company });
      onFeedback(fb);
    } catch (err) {
      setError(err instanceof AiRequestError ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const notConfigured = status && !status.aiConfigured;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-[0.8125rem] text-muted">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-pine" />
          <span>Sends only this question and answer{effectiveRole ? " (with your target role)" : ""} to Groq&apos;s AI service. Nothing else from your workspace is shared.</span>
        </p>
        <Button
          variant={feedback ? "secondary" : "primary"}
          onClick={run}
          loading={loading}
          disabled={tooShort}
          icon={feedback ? <RotateCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          className="shrink-0"
        >
          {loading ? "Analysing…" : feedback ? "Analyse again" : buttonLabel}
        </Button>
      </div>

      {tooShort && !feedback && <p className="text-[0.8125rem] text-faint">Write at least a couple of sentences to get feedback.</p>}

      {notConfigured && !feedback && (
        <div className="rounded-xl border border-line bg-surface-2 p-3.5 text-[0.8125rem] text-muted">
          <p className="font-medium text-ink">AI feedback isn&apos;t set up on this deployment</p>
          <p className="mt-1">
            Add a <code className="rounded bg-sunken px-1">GROQ_API_KEY</code> environment variable (in <code className="rounded bg-sunken px-1">.env.local</code>{" "}
            locally, or in Vercel&apos;s project settings) and redeploy. Everything else in the app works without it.
          </p>
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl bg-rose-soft p-3.5 text-sm text-rose-text">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <p>{error}</p>
            <button type="button" onClick={run} className="mt-1 font-medium underline underline-offset-2">
              Try again
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="space-y-3" aria-live="polite" aria-label="Analysing your answer">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-16" />
          <div className="grid gap-3 md:grid-cols-2">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </div>
      )}

      {!loading && feedback && <FeedbackPanel feedback={feedback} currentAnswer={answer} onUseSuggested={onUseSuggested} />}
    </div>
  );
}

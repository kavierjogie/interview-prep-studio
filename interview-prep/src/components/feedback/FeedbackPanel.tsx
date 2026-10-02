"use client";

import { useState, type ReactNode } from "react";
import { AlertTriangle, ArrowRight, Check, CircleDashed, Copy, Info, MinusCircle, Sparkles } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { DimensionLevel, FeedbackVerdict, StarStatus, StoredFeedback } from "@/lib/types";
import { cn, relativeTime } from "@/lib/utils";

const VERDICT: Record<FeedbackVerdict, { label: string; tone: BadgeTone }> = {
  strong: { label: "Interview-ready", tone: "pine" },
  developing: { label: "Developing", tone: "sky" },
  "needs-work": { label: "Needs work", tone: "marigold" },
};

const STAR_META: Record<StarStatus, { label: string; cls: string; Icon: typeof Check }> = {
  clear: { label: "Clear", cls: "text-pine-text", Icon: Check },
  partial: { label: "Needs more detail", cls: "text-marigold-text", Icon: AlertTriangle },
  missing: { label: "Missing", cls: "text-rose-text", Icon: CircleDashed },
  "not-applicable": { label: "Not applicable", cls: "text-faint", Icon: MinusCircle },
};

const LEVEL: Record<DimensionLevel, { label: string; dots: number; cls: string }> = {
  strong: { label: "Strong", dots: 3, cls: "bg-pine" },
  okay: { label: "Okay", dots: 2, cls: "bg-sky-text" },
  weak: { label: "Weak", dots: 1, cls: "bg-marigold" },
};

function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={className}>
      <h4 className="mb-2.5 text-[0.8125rem] font-semibold text-muted">{title}</h4>
      {children}
    </section>
  );
}

export function FeedbackPanel({
  feedback,
  currentAnswer,
  onUseSuggested,
}: {
  feedback: StoredFeedback;
  /** If provided and different from the analysed snapshot, we show that the feedback is out of date. */
  currentAnswer?: string;
  onUseSuggested?: (text: string) => void;
}) {
  const toast = useToast();
  const [showLegend, setShowLegend] = useState(false);
  const stale = currentAnswer !== undefined && currentAnswer.trim() !== feedback.answerSnapshot.trim();
  const verdict = VERDICT[feedback.verdict];
  const star = feedback.starAnalysis;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(feedback.suggestedAnswer);
      toast.success("Suggested answer copied");
    } catch {
      toast.error("Couldn't copy to the clipboard. Select the text and copy it manually.");
    }
  };

  return (
    <div className="space-y-6" aria-label="AI feedback">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={verdict.tone}>{verdict.label}</Badge>
          <button
            type="button"
            onClick={() => setShowLegend((s) => !s)}
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink"
            aria-expanded={showLegend}
          >
            <Info className="h-3.5 w-3.5" /> What does this mean?
          </button>
          <span className="ml-auto text-xs text-faint">
            {feedback.model === "sample" ? "Example feedback" : `Analysed ${relativeTime(feedback.analyzedAt).replace(/^(Just now|Yesterday)$/, (m) => m.toLowerCase())}`}
          </span>
        </div>
        {feedback.verdictExplanation && <p className="mt-2 text-sm text-muted">{feedback.verdictExplanation}</p>}
        {showLegend && (
          <div className="mt-3 rounded-xl bg-surface-2 p-3 text-[0.8125rem] text-muted">
            The label is a rough guide, not a grade. <strong className="text-ink">Interview-ready</strong> means changes would polish it;{" "}
            <strong className="text-ink">Developing</strong> means a solid base with one clear gap;{" "}
            <strong className="text-ink">Needs work</strong> means key parts are missing. The improvements below matter more than the label.
          </div>
        )}
        {stale && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-marigold-soft px-3 py-2 text-[0.8125rem] text-marigold-text">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            You&apos;ve changed the answer since this feedback. Analyse again for up-to-date feedback.
          </p>
        )}
      </div>

      {feedback.overallFeedback && <p className="text-[0.96875rem] leading-relaxed">{feedback.overallFeedback}</p>}

      <div className="grid gap-5 md:grid-cols-2">
        {feedback.strengths.length > 0 && (
          <Section title="Strengths">
            <ul className="space-y-2">
              {feedback.strengths.map((s, i) => (
                <li key={i} className="flex gap-2.5 text-[0.90625rem]">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-pine" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}
        {feedback.improvements.length > 0 && (
          <Section title="Improve">
            <ul className="space-y-2">
              {feedback.improvements.map((s, i) => (
                <li key={i} className="flex gap-2.5 text-[0.90625rem]">
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-marigold" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>

      <Section title="STAR analysis">
        {feedback.isBehavioural ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {(["situation", "task", "action", "result"] as const).map((key) => {
              const el = star[key];
              const meta = STAR_META[el.status];
              return (
                <div key={key} className="rounded-xl border border-line p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-[0.9375rem] font-semibold capitalize">{key}</span>
                    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", meta.cls)}>
                      <meta.Icon className="h-3.5 w-3.5" />
                      {meta.label}
                    </span>
                  </div>
                  {el.comment && <p className="mt-1.5 text-[0.8125rem] leading-snug text-muted">{el.comment}</p>}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted">
            STAR doesn&apos;t really apply to this type of question, so the feedback focuses on relevance, structure and clarity instead.
          </p>
        )}
      </Section>

      {feedback.dimensions.length > 0 && (
        <Section title="How it comes across">
          <ul className="divide-y divide-line rounded-xl border border-line">
            {feedback.dimensions.map((d) => {
              const lvl = LEVEL[d.level];
              return (
                <li key={d.key} className="flex flex-col gap-1 px-3.5 py-2.5 sm:flex-row sm:items-start sm:gap-4">
                  <div className="flex w-full items-center justify-between gap-3 sm:w-52 sm:shrink-0">
                    <span className="text-sm font-medium">{d.label}</span>
                    <span className="flex items-center gap-1.5" aria-label={lvl.label}>
                      {[0, 1, 2].map((i) => (
                        <span key={i} className={cn("h-1.5 w-4 rounded-full", i < lvl.dots ? lvl.cls : "bg-sunken")} />
                      ))}
                    </span>
                  </div>
                  {d.note && <p className="text-[0.8125rem] text-muted">{d.note}</p>}
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {feedback.suggestedImprovements.length > 0 && (
        <Section title="Try this">
          <ul className="space-y-2">
            {feedback.suggestedImprovements.map((s, i) => (
              <li key={i} className="rounded-xl bg-surface-2 px-3.5 py-2.5 text-[0.90625rem]">
                {s}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {feedback.suggestedAnswer && (
        <Section title="Suggested version">
          <div className="rounded-xl border border-pine/30 bg-pine-soft/50 p-4">
            <p className="whitespace-pre-line text-[0.90625rem] leading-relaxed">{feedback.suggestedAnswer}</p>
            <p className="mt-3 text-xs text-muted">
              Built only from details in your answer. Fill in anything in [square brackets] and keep it in your own words.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" icon={<Copy className="h-3.5 w-3.5" />} onClick={copy}>
                Copy
              </Button>
              {onUseSuggested && (
                <Button size="sm" variant="subtle" icon={<Sparkles className="h-3.5 w-3.5" />} onClick={() => onUseSuggested(feedback.suggestedAnswer)}>
                  Use as my answer
                </Button>
              )}
            </div>
          </div>
        </Section>
      )}

      {feedback.followUpQuestions.length > 0 && (
        <Section title="Likely follow-up questions">
          <ol className="list-decimal space-y-1.5 pl-5 text-[0.90625rem] marker:text-faint">
            {feedback.followUpQuestions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ol>
        </Section>
      )}
    </div>
  );
}

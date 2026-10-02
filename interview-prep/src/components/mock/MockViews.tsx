"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { ArrowRight, Check, Clock, ListChecks, Mic, Plus, Sparkles, TrendingUp } from "lucide-react";
import { AiRequestError, analyzeAnswer } from "@/lib/ai-client";
import { CUSTOM_TEMPLATE_ID, MOCK_TEMPLATES } from "@/lib/mock-templates";
import { buildSessionSummary } from "@/lib/session-summary";
import { useStore } from "@/lib/store";
import type { PracticeAttempt } from "@/lib/types";
import { useAiStatus } from "@/lib/use-ai-status";
import { cn, formatDuration, normalizeText, relativeTime, wordCount } from "@/lib/utils";
import { AnalyzePanel } from "@/components/feedback/AnalyzePanel";
import { PageHeader } from "@/components/layout/PageHeader";
import { PracticeRunner, type PlannedQuestion } from "@/components/practice/PracticeRunner";
import { SessionHistory } from "@/components/practice/SessionHistory";
import { HeardTranscript, VoiceBadge } from "@/components/practice/VoiceBits";
import { CategoryBadge } from "@/components/questions/QuestionBits";
import { QuestionPicker } from "@/components/questions/QuestionPicker";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Collapsible } from "@/components/ui/Collapsible";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/Progress";
import { useToast } from "@/components/ui/Toast";

/* ---------------- Setup + run ---------------- */

export function MockView() {
  const { data, startSession } = useStore();
  const router = useRouter();
  const [templateId, setTemplateId] = useState(MOCK_TEMPLATES[0].id);
  const [custom, setCustom] = useState<string[]>([]);
  const [running, setRunning] = useState<{ sessionId: string; plan: PlannedQuestion[] } | null>(null);

  const bankByText = useMemo(() => new Map(data.questions.map((q) => [normalizeText(q.text), q])), [data.questions]);

  const plan: PlannedQuestion[] = useMemo(() => {
    if (templateId === CUSTOM_TEMPLATE_ID) {
      return custom
        .map((id) => data.questions.find((q) => q.id === id))
        .filter((q) => !!q)
        .map((q) => ({ questionId: q!.id, text: q!.text, category: q!.category }));
    }
    const t = MOCK_TEMPLATES.find((x) => x.id === templateId)!;
    // Link template questions to matching bank questions so practice progress is tracked.
    return t.questions.map((q) => ({ questionId: bankByText.get(normalizeText(q.text))?.id ?? null, text: q.text, category: q.category }));
  }, [templateId, custom, data.questions, bankByText]);

  if (running) {
    return (
      <PracticeRunner
        key={running.sessionId}
        sessionId={running.sessionId}
        plan={running.plan}
        mode="mock"
        onComplete={() => router.push(`/mock/${running.sessionId}`)}
      />
    );
  }

  const template = MOCK_TEMPLATES.find((t) => t.id === templateId);
  const begin = () => {
    if (plan.length === 0) return;
    const session = startSession({
      mode: "mock",
      sourceType: "mock",
      label: template?.title ?? "Custom interview",
      templateId,
      plannedQuestions: plan,
    });
    setRunning({ sessionId: session.id, plan });
    window.scrollTo({ top: 0 });
  };

  return (
    <>
      <PageHeader
        title="Mock interview"
        description="A full interview, one question after another with no hints. You get a summary and optional AI feedback at the end."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3" role="radiogroup" aria-label="Interview type">
          {[...MOCK_TEMPLATES, null].map((t) => {
            const id = t?.id ?? CUSTOM_TEMPLATE_ID;
            const selected = templateId === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setTemplateId(id)}
                className={cn(
                  "flex w-full items-start gap-4 rounded-2xl border bg-surface p-4 text-left press sm:p-5",
                  selected ? "border-pine ring-1 ring-pine" : "border-line hover:border-line-strong",
                )}
              >
                <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2", selected ? "border-pine bg-pine" : "border-line-strong")}>
                  {selected && <span className="h-2 w-2 rounded-full bg-pine-ink" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-display text-[1.0625rem] font-semibold">{t?.title ?? "Custom interview"}</span>
                    <span className="text-[0.8125rem] text-muted">{t ? `${t.questions.length} questions, ${t.durationHint.toLowerCase()}` : "Choose your own questions"}</span>
                  </span>
                  <span className="mt-0.5 block text-sm text-muted">{t?.description ?? "Pick any questions from your bank, in the order you want them asked."}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader title={template?.title ?? "Custom interview"} description={`${plan.length} question${plan.length === 1 ? "" : "s"}`} />
            <CardBody className="space-y-4">
              {templateId === CUSTOM_TEMPLATE_ID ? (
                data.questions.length === 0 ? (
                  <p className="text-sm text-muted">Add questions to your bank to build a custom interview.</p>
                ) : (
                  <QuestionPicker questions={data.questions} selected={custom} onChange={setCustom} maxHeight="max-h-72" />
                )
              ) : (
                <ol className="list-decimal space-y-1.5 pl-5 text-sm marker:text-faint">
                  {plan.map((q, i) => (
                    <li key={i}>{q.text}</li>
                  ))}
                </ol>
              )}
              <Button variant="primary" size="lg" className="w-full" icon={<Mic className="h-4 w-4" />} disabled={plan.length === 0} onClick={begin}>
                Start mock interview
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold">Past mock interviews</h2>
        <SessionHistory mode="mock" />
      </section>
    </>
  );
}

/* ---------------- Summary ---------------- */

export function MockSummaryView() {
  const { id } = useParams<{ id: string }>();
  const { data, updateAttempt, addQuestion } = useStore();
  const toast = useToast();
  const aiStatus = useAiStatus();
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const session = data.sessions.find((s) => s.id === id);
  const attempts = useMemo(
    () => data.attempts.filter((a) => a.sessionId === id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [data.attempts, id],
  );
  const live = useMemo(() => buildSessionSummary(attempts, data.questions), [attempts, data.questions]);

  if (!session) {
    return (
      <EmptyState
        title="Interview not found"
        description="It may have been deleted, or the link is from another browser."
        action={<ButtonLink href="/mock">Back to mock interviews</ButtonLink>}
      />
    );
  }

  // Sample sessions ship with a hand-written summary; real sessions are always summarised live from their attempts.
  const summary = session.id.startsWith("sample_") && session.summary && !live.usedAi ? session.summary : live;
  const answered = attempts.filter((a) => !a.skipped);
  const pending = answered.filter((a) => !a.feedback && a.answer.trim().length >= 20);
  const recommended = summary.recommendedQuestionIds.map((qid) => data.questions.find((q) => q.id === qid)).filter((q) => !!q);
  const unmatched = attempts.filter(
    (a) => !data.questions.some((q) => q.id === a.questionId || normalizeText(q.text) === normalizeText(a.questionText)),
  );

  const analyseAll = async () => {
    setBulkError(null);
    setBulk({ done: 0, total: pending.length });
    let done = 0;
    for (const a of pending) {
      try {
        const fb = await analyzeAnswer({ question: a.questionText, category: a.category, answer: a.answer });
        updateAttempt(a.id, { feedback: fb });
        done++;
        setBulk({ done, total: pending.length });
      } catch (err) {
        setBulkError(
          `${done} of ${pending.length} answers analysed. ${err instanceof AiRequestError ? err.message : "Something went wrong."}`,
        );
        break;
      }
    }
    setBulk(null);
    if (done === pending.length && done > 0) toast.success("All answers analysed");
  };

  return (
    <>
      <PageHeader
        back={{ href: "/mock", label: "Mock interviews" }}
        title={`${session.label} summary`}
        description={`${relativeTime(session.startedAt)}${session.endedAt ? "" : ", not finished"}`}
        actions={
          <ButtonLink href="/mock" variant="primary" icon={<Mic className="h-4 w-4" />}>
            New mock interview
          </ButtonLink>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={<ListChecks className="h-4 w-4" />} label="Questions completed" value={`${attempts.length} of ${session.plannedQuestions.length || attempts.length}`} />
        <Stat icon={<Check className="h-4 w-4" />} label="Answers submitted" value={String(answered.length)} />
        <Stat icon={<Clock className="h-4 w-4" />} label="Time spent" value={formatDuration(session.totalDurationSec)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Common strengths" />
          <CardBody>
            {summary.strengths.length === 0 ? (
              <p className="text-sm text-muted">Submit a few full answers to see patterns.</p>
            ) : (
              <ul className="space-y-2">
                {summary.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2.5 text-[0.90625rem]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-pine" />
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Common improvement areas" />
          <CardBody>
            {summary.improvements.length === 0 ? (
              <p className="text-sm text-muted">No recurring gaps found. Nice work.</p>
            ) : (
              <ul className="space-y-2">
                {summary.improvements.map((s, i) => (
                  <li key={i} className="flex gap-2.5 text-[0.90625rem]">
                    <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-marigold" />
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">{live.usedAi ? "Includes AI feedback" : "Based on quick checks"}</p>
            <p className="text-sm text-muted">
              {pending.length > 0
                ? `Get detailed AI feedback on the ${pending.length} answer${pending.length === 1 ? "" : "s"} not yet analysed. Each answer is sent on its own.`
                : "Every answer in this interview has AI feedback."}
            </p>
            {aiStatus && !aiStatus.aiConfigured && <p className="mt-1 text-[0.8125rem] text-faint">AI isn&apos;t configured on this deployment (no GROQ_API_KEY).</p>}
          </div>
          {pending.length > 0 && (
            <Button variant="primary" icon={<Sparkles className="h-4 w-4" />} onClick={analyseAll} loading={!!bulk} className="shrink-0">
              {bulk ? `Analysing ${bulk.done + 1} of ${bulk.total}` : "Analyse all answers"}
            </Button>
          )}
        </CardBody>
        {bulk && <ProgressBar value={bulk.done} max={bulk.total} className="rounded-none" label="Analysis progress" />}
        {bulkError && <p role="alert" className="border-t border-line bg-rose-soft px-5 py-3 text-sm text-rose-text">{bulkError}</p>}
      </Card>

      {recommended.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Practise these next" />
          <CardBody>
            <ul className="divide-y divide-line">
              {recommended.map((q) => (
                <li key={q!.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <Link href={`/questions/${q!.id}`} className="min-w-0 text-sm font-medium hover:underline">
                    {q!.text}
                  </Link>
                  <ButtonLink href={`/practice?q=${q!.id}`} size="sm" variant="ghost" icon={<ArrowRight className="h-3.5 w-3.5" />}>
                    Practise
                  </ButtonLink>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      <section className="mt-8">
        <h2 className="mb-4 text-xl font-semibold">Your answers</h2>
        <div className="space-y-2">
          {attempts.map((a, i) => (
            <AttemptReview key={a.id} attempt={a} index={i} />
          ))}
        </div>
      </section>

      {unmatched.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Not in your question bank" description="Add these so you can save answers and track them." />
          <CardBody className="space-y-2">
            {unmatched.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3">
                <span className="text-sm">{a.questionText}</span>
                <Button
                  size="sm"
                  icon={<Plus className="h-3.5 w-3.5" />}
                  onClick={() => {
                    addQuestion({ text: a.questionText, category: a.category, answer: a.skipped ? "" : a.answer });
                    toast.success("Added to your question bank");
                  }}
                >
                  Add
                </Button>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardBody className="py-4">
        <p className="flex items-center gap-1.5 text-[0.8125rem] text-muted">
          {icon}
          {label}
        </p>
        <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
      </CardBody>
    </Card>
  );
}

function AttemptReview({ attempt, index }: { attempt: PracticeAttempt; index: number }) {
  const { updateAttempt } = useStore();
  return (
    <Collapsible
      title={
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-faint">{index + 1}.</span>
          <span>{attempt.questionText}</span>
          {attempt.skipped ? <Badge>Skipped</Badge> : <span className="text-xs font-normal text-muted">{formatDuration(attempt.durationSec)}, {wordCount(attempt.answer)} words</span>}
          {!attempt.skipped && <VoiceBadge attempt={attempt} />}
          {attempt.feedback && <Badge tone="sky">AI feedback</Badge>}
        </span>
      }
    >
      <div className="space-y-4">
        <CategoryBadge category={attempt.category} />
        {attempt.skipped ? (
          <p className="text-sm text-muted">You skipped this question.</p>
        ) : (
          <>
            <div>
              <p className="whitespace-pre-line text-[0.90625rem] leading-relaxed">{attempt.answer}</p>
              <HeardTranscript attempt={attempt} />
            </div>
            <div className="border-t border-line pt-4">
              <AnalyzePanel
                question={attempt.questionText}
                category={attempt.category}
                answer={attempt.answer}
                feedback={attempt.feedback}
                onFeedback={(fb) => updateAttempt(attempt.id, { feedback: fb })}
              />
            </div>
          </>
        )}
      </div>
    </Collapsible>
  );
}

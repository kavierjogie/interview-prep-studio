"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Briefcase, Check, Dices, LayoutGrid, ListChecks, Play, RotateCcw } from "lucide-react";
import { getCategory, isCategoryId } from "@/lib/categories";
import { runLocalChecks } from "@/lib/local-checks";
import { computeCategoryStats, recommendQuestions } from "@/lib/stats";
import { useStore } from "@/lib/store";
import type { CategoryId, PracticeSourceType, Question } from "@/lib/types";
import { cn, formatDuration, shuffle } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { QuestionPicker } from "@/components/questions/QuestionPicker";
import { RatingBadge } from "@/components/questions/QuestionBits";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Select } from "@/components/ui/Field";
import { ProgressBar } from "@/components/ui/Progress";
import { Segmented } from "@/components/ui/Segmented";
import { PracticeRunner, type PlannedQuestion } from "./PracticeRunner";
import { SessionHistory } from "./SessionHistory";

type Stage =
  | { kind: "setup" }
  | { kind: "run"; sessionId: string; plan: PlannedQuestion[]; context?: { role?: string; company?: string } }
  | { kind: "done"; sessionId: string };

type SetupMode = "random" | "category" | "specific" | "job";

const toPlan = (qs: Question[]): PlannedQuestion[] => qs.map((q) => ({ questionId: q.id, text: q.text, category: q.category }));

export function PracticeView() {
  const { data, startSession } = useStore();
  const params = useSearchParams();
  const [stage, setStage] = useState<Stage>({ kind: "setup" });

  const begin = (questions: Question[], sourceType: PracticeSourceType, label: string, jobPrepId?: string) => {
    if (questions.length === 0) return;
    const plan = toPlan(questions);
    const session = startSession({ mode: "practice", sourceType, label, plannedQuestions: plan, jobPrepId });
    const job = jobPrepId ? data.jobPreps.find((j) => j.id === jobPrepId) : undefined;
    setStage({ kind: "run", sessionId: session.id, plan, context: job ? { role: job.role, company: job.company } : undefined });
    window.scrollTo({ top: 0 });
  };

  // Deep link: /practice?q=<id> starts a single-question session straight away.
  const autoStarted = useRef(false);
  const directId = params.get("q");
  useEffect(() => {
    if (autoStarted.current || !directId) return;
    const q = data.questions.find((x) => x.id === directId);
    if (!q) return;
    autoStarted.current = true;
    // One-shot deep link (guarded by a ref): starting a session is the intended side effect of opening this URL.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    begin([q], "specific", "Single question");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once for the deep link
  }, [directId]);

  if (stage.kind === "run") {
    return (
      <PracticeRunner
        key={stage.sessionId}
        sessionId={stage.sessionId}
        plan={stage.plan}
        mode="practice"
        context={stage.context}
        onComplete={() => setStage({ kind: "done", sessionId: stage.sessionId })}
      />
    );
  }

  if (stage.kind === "done") {
    return <PracticeSummary sessionId={stage.sessionId} onRestart={() => setStage({ kind: "setup" })} />;
  }

  return <PracticeSetup onBegin={begin} />;
}

/* ---------------- Setup ---------------- */

function PracticeSetup({ onBegin }: { onBegin: (qs: Question[], src: PracticeSourceType, label: string, jobPrepId?: string) => void }) {
  const { data } = useStore();
  const params = useSearchParams();
  const initialCategory = params.get("category");
  const initialJob = params.get("job");

  const [mode, setMode] = useState<SetupMode>(initialJob ? "job" : isCategoryId(initialCategory) ? "category" : "random");
  const [count, setCount] = useState(5);
  const [focusWeak, setFocusWeak] = useState(true);
  const [category, setCategory] = useState<CategoryId>(isCategoryId(initialCategory) ? initialCategory : "teamwork");
  const [specific, setSpecific] = useState<string[]>([]);
  const [jobId, setJobId] = useState<string>(initialJob ?? data.jobPreps[0]?.id ?? "");

  const stats = useMemo(() => computeCategoryStats(data), [data]);
  const jobQuestions = data.questions.filter((q) => q.jobPrepId === jobId);

  const selection = useMemo((): Question[] => {
    switch (mode) {
      case "random": {
        if (focusWeak) {
          const rec = recommendQuestions(data.questions, count).map((r) => r.question);
          const rest = shuffle(data.questions.filter((q) => !rec.includes(q)));
          return [...rec, ...rest].slice(0, count);
        }
        return shuffle(data.questions).slice(0, count);
      }
      case "category":
        return shuffle(data.questions.filter((q) => q.category === category)).slice(0, count);
      case "specific":
        return specific.map((id) => data.questions.find((q) => q.id === id)).filter((q): q is Question => !!q);
      case "job":
        return shuffle(jobQuestions);
    }
  }, [mode, focusWeak, count, category, specific, data.questions, jobQuestions]);

  const job = data.jobPreps.find((j) => j.id === jobId);
  const label =
    mode === "random"
      ? "Random questions"
      : mode === "category"
        ? getCategory(category).label
        : mode === "specific"
          ? "Specific questions"
          : `${job?.company || "Job"}${job?.role ? `: ${job.role}` : ""}`;

  const estMinutes = Math.max(1, Math.round((selection.length * (data.settings.answerTargetSec + 30)) / 60));

  if (data.questions.length === 0) {
    return (
      <>
        <PageHeader title="Practice" />
        <EmptyState
          title="Add some questions first"
          description="Practice pulls from your question bank. Add questions yourself or generate them from a job description."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <ButtonLink href="/questions" variant="primary">
                Go to question bank
              </ButtonLink>
              <ButtonLink href="/prepare">Prepare for a job</ButtonLink>
            </div>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Practice"
        description="Answer one question at a time against the clock, then review it with quick checks and optional AI feedback."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card>
          <CardHeader title="What do you want to practise?" />
          <CardBody className="space-y-5">
            <Segmented
              label="Practice source"
              value={mode}
              onChange={setMode}
              options={[
                { value: "random", label: "Random", icon: <Dices className="h-4 w-4" /> },
                { value: "category", label: "Category", icon: <LayoutGrid className="h-4 w-4" /> },
                { value: "specific", label: "Pick questions", icon: <ListChecks className="h-4 w-4" /> },
                { value: "job", label: "Job prep", icon: <Briefcase className="h-4 w-4" /> },
              ]}
            />

            {(mode === "random" || mode === "category") && (
              <Field label="Number of questions" htmlFor="p-count">
                <Select id="p-count" value={count} onChange={(e) => setCount(Number(e.target.value))} className="sm:w-48">
                  {[1, 3, 5, 8, 10].map((n) => (
                    <option key={n} value={n}>
                      {n} question{n === 1 ? "" : "s"}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            {mode === "random" && (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3.5">
                <input type="checkbox" checked={focusWeak} onChange={(e) => setFocusWeak(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--pine)]" />
                <span>
                  <span className="block text-sm font-medium">Prioritise what needs work</span>
                  <span className="text-[13px] text-muted">Starts with questions marked for improvement or never practised.</span>
                </span>
              </label>
            )}

            {mode === "category" && (
              <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Category">
                {stats
                  .filter((s) => s.total > 0)
                  .map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      role="radio"
                      aria-checked={category === s.id}
                      onClick={() => setCategory(s.id)}
                      className={cn(
                        "rounded-xl border p-3 text-left transition-colors",
                        category === s.id ? "border-pine bg-pine-soft/60" : "border-line hover:border-line-strong",
                      )}
                    >
                      <span className="flex items-center justify-between gap-2 text-sm font-medium">
                        {s.label}
                        <span className="text-xs font-normal text-muted">
                          {s.practiced}/{s.total} practised
                        </span>
                      </span>
                      <ProgressBar value={s.readiness} className="mt-2 h-1.5" label={`${s.label} readiness`} />
                    </button>
                  ))}
              </div>
            )}

            {mode === "specific" && <QuestionPicker questions={data.questions} selected={specific} onChange={setSpecific} />}

            {mode === "job" &&
              (data.jobPreps.length === 0 ? (
                <p className="rounded-xl bg-surface-2 p-4 text-sm text-muted">
                  You haven&apos;t created any job preparation sessions.{" "}
                  <Link href="/prepare" className="font-medium text-pine-text hover:underline">
                    Paste a job description
                  </Link>{" "}
                  to generate tailored questions.
                </p>
              ) : (
                <div className="space-y-3">
                  <Field label="Preparation session" htmlFor="p-job">
                    <Select id="p-job" value={jobId} onChange={(e) => setJobId(e.target.value)}>
                      {data.jobPreps.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.company || "Untitled company"}
                          {j.role ? `: ${j.role}` : ""}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  {jobQuestions.length === 0 && (
                    <p className="text-sm text-muted">
                      No questions from this session are in your bank yet.{" "}
                      <Link href={`/prepare/${jobId}`} className="font-medium text-pine-text hover:underline">
                        Add suggested questions
                      </Link>
                    </p>
                  )}
                </div>
              ))}
          </CardBody>
        </Card>

        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardBody className="space-y-4">
              <div>
                <p className="text-sm text-muted">Ready to practise</p>
                <p className="font-display text-2xl font-semibold">
                  {selection.length} question{selection.length === 1 ? "" : "s"}
                </p>
                <p className="text-sm text-muted">About {estMinutes} min with a {formatDuration(data.settings.answerTargetSec)} answer target</p>
              </div>
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                icon={<Play className="h-4 w-4" />}
                disabled={selection.length === 0}
                onClick={() => onBegin(selection, mode === "job" ? "job-prep" : mode, label, mode === "job" ? jobId : undefined)}
              >
                Start practice
              </Button>
              <p className="text-xs text-faint">Change the answer target in Settings.</p>
            </CardBody>
          </Card>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold">Practice history</h2>
        <SessionHistory />
      </section>
    </>
  );
}

/* ---------------- Summary ---------------- */

function PracticeSummary({ sessionId, onRestart }: { sessionId: string; onRestart: () => void }) {
  const { data } = useStore();
  const session = data.sessions.find((s) => s.id === sessionId);
  const attempts = data.attempts.filter((a) => a.sessionId === sessionId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const answered = attempts.filter((a) => !a.skipped);
  const next = recommendQuestions(data.questions, 3);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-pine-soft text-pine-text">
          <Check className="h-6 w-6" />
        </span>
        <h1 className="text-[30px] font-semibold">Session complete</h1>
        <p className="mt-1 text-muted">
          {answered.length} of {attempts.length || session?.plannedQuestions.length || 0} answered in {formatDuration(session?.totalDurationSec ?? 0)}.
        </p>
      </div>

      {attempts.length > 0 && (
        <Card className="mb-6">
          <ul className="divide-y divide-line">
            {attempts.map((a) => {
              const gaps = a.skipped ? [] : runLocalChecks(a.answer, a.category).filter((c) => !c.passed);
              return (
                <li key={a.id} className="flex flex-col gap-1.5 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium">{a.questionText}</p>
                    <p className="text-[13px] text-muted">
                      {a.skipped ? "Skipped" : gaps.length === 0 ? "All quick checks passed" : `To improve: ${gaps.map((g) => g.label.toLowerCase()).join(", ")}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {!a.skipped && <span className="text-xs text-faint">{formatDuration(a.durationSec)}</span>}
                    <RatingBadge rating={a.selfRating} />
                    {a.feedback && <Badge tone="sky">AI feedback</Badge>}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {next.length > 0 && (
        <Card className="mb-6">
          <CardHeader title="Practise next" />
          <CardBody>
            <ul className="space-y-2">
              {next.map((r) => (
                <li key={r.question.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/questions/${r.question.id}`} className="text-sm font-medium hover:underline">
                      {r.question.text}
                    </Link>
                    <p className="text-xs text-muted">{r.reason}</p>
                  </div>
                  <ButtonLink href={`/practice?q=${r.question.id}`} size="sm" variant="ghost">
                    Practise
                  </ButtonLink>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" icon={<RotateCcw className="h-4 w-4" />} onClick={onRestart}>
          Practise again
        </Button>
        <ButtonLink href="/">Back to dashboard</ButtonLink>
      </div>
    </div>
  );
}


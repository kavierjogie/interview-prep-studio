"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Lightbulb, Pause, Play, Save, SkipForward, X } from "lucide-react";
import { getCategory } from "@/lib/categories";
import { runLocalChecks } from "@/lib/local-checks";
import { useStore } from "@/lib/store";
import type { CategoryId, SessionMode } from "@/lib/types";
import { useStopwatch } from "@/lib/use-stopwatch";
import { useUnsavedGuard } from "@/lib/use-unsaved-guard";
import { formatDuration, wordCount } from "@/lib/utils";
import { AnalyzePanel } from "@/components/feedback/AnalyzePanel";
import { LocalChecks } from "@/components/feedback/LocalChecks";
import { RatingControl } from "@/components/questions/QuestionBits";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Collapsible } from "@/components/ui/Collapsible";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ProgressBar } from "@/components/ui/Progress";
import { useToast } from "@/components/ui/Toast";
import { AnswerComposer } from "./AnswerComposer";
import { TimerRing } from "./TimerRing";

export interface PlannedQuestion {
  questionId: string | null;
  text: string;
  category: CategoryId;
}

export function PracticeRunner({
  sessionId,
  plan,
  mode,
  onComplete,
  context,
}: {
  sessionId: string;
  plan: PlannedQuestion[];
  mode: SessionMode;
  onComplete: () => void;
  /** Optional role/company context passed to AI analysis for job-specific practice. */
  context?: { role?: string; company?: string };
}) {
  const { data, recordAttempt, updateAttempt, updateQuestion, finishSession } = useStore();
  const toast = useToast();
  const sw = useStopwatch();
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"answer" | "review">("answer");
  const [draft, setDraft] = useState("");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  useUnsavedGuard(phase === "answer" && draft.trim() !== "");
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const current = plan[index];
  const bankQuestion = current.questionId ? data.questions.find((q) => q.id === current.questionId) : undefined;
  const attempt = attemptId ? data.attempts.find((a) => a.id === attemptId) : undefined;
  const isLast = index === plan.length - 1;
  const targetSec = data.settings.answerTargetSec;
  const cat = getCategory(current.category);

  const linkedStories = useMemo(
    () => (bankQuestion ? data.stories.filter((s) => bankQuestion.storyIds.includes(s.id)) : []),
    [bankQuestion, data.stories],
  );

  const complete = () => {
    sw.pause();
    finishSession(sessionId);
    onComplete();
  };

  const advance = () => {
    if (isLast) return complete();
    setIndex((i) => i + 1);
    setDraft("");
    setAttemptId(null);
    setPhase("answer");
    sw.reset();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = () => {
    const answer = draft.trim();
    if (!answer) return;
    const secs = sw.read();
    sw.pause();
    const a = recordAttempt(sessionId, {
      questionId: current.questionId,
      questionText: current.text,
      category: current.category,
      answer,
      durationSec: secs,
      skipped: false,
    });
    if (mode === "practice") {
      setAttemptId(a.id);
      setPhase("review");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      advance();
    }
  };

  const skip = () => {
    recordAttempt(sessionId, {
      questionId: current.questionId,
      questionText: current.text,
      category: current.category,
      answer: draft.trim(),
      durationSec: sw.read(),
      skipped: true,
    });
    advance();
  };

  // Cmd/Ctrl + Enter submits.
  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && phase === "answer") {
        e.preventDefault();
        submitRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  const checks = attempt ? runLocalChecks(attempt.answer, attempt.category) : [];

  return (
    <div className="mx-auto max-w-4xl">
      {/* Progress header */}
      <div className="mb-6 flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center justify-between text-[0.8125rem] text-muted">
            <span>
              Question {index + 1} of {plan.length}
            </span>
            <span>{mode === "mock" ? "Mock interview" : "Practice"}</span>
          </div>
          <ProgressBar value={index + (phase === "review" ? 1 : 0)} max={plan.length} label="Session progress" />
        </div>
        <Button size="sm" variant="ghost" icon={<X className="h-3.5 w-3.5" />} onClick={() => setConfirmEnd(true)}>
          End
        </Button>
      </div>

      {phase === "answer" && (
        <>
          <section aria-labelledby="question-text" className="mb-6 flex flex-col-reverse gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="mb-3 text-sm font-medium text-pine-text">{cat.label}</p>
              <h1 id="question-text" className="text-[1.625rem] font-semibold leading-[1.18] sm:text-[2.25rem]">
                {current.text}
              </h1>
              {mode === "mock" && index === 0 && sw.elapsed === 0 && (
                <p className="mt-3 text-sm text-muted">Answer each question as you would in the room. Feedback comes at the end.</p>
              )}
            </div>
            <div className="flex items-center gap-4 sm:flex-col">
              <TimerRing elapsed={sw.elapsed} targetSec={targetSec} running={sw.running} />
              {sw.running ? (
                <Button size="sm" variant="subtle" icon={<Pause className="h-3.5 w-3.5" />} onClick={sw.pause}>
                  Pause
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant={sw.elapsed === 0 ? "primary" : "subtle"}
                  icon={<Play className="h-3.5 w-3.5" />}
                  onClick={() => {
                    sw.start();
                    composerRef.current?.focus();
                  }}
                >
                  {sw.elapsed === 0 ? "Start" : "Resume"}
                </Button>
              )}
            </div>
          </section>

          <AnswerComposer ref={composerRef} method="text" value={draft} onChange={setDraft} onActivity={sw.start} />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <Button variant="ghost" icon={<SkipForward className="h-4 w-4" />} onClick={skip}>
              Skip question
            </Button>
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-faint sm:inline">Ctrl + Enter to submit</span>
              <Button variant="primary" size="lg" icon={<Check className="h-4 w-4" />} onClick={submit} disabled={!draft.trim()}>
                Submit answer
              </Button>
            </div>
          </div>

          {mode === "practice" && bankQuestion && (bankQuestion.answer || bankQuestion.notes || linkedStories.length > 0) && (
            <Collapsible
              className="mt-8"
              title={
                <span className="inline-flex items-center gap-2 text-muted">
                  <Lightbulb className="h-4 w-4" /> Peek at your notes and stories
                </span>
              }
            >
              <div className="space-y-4 text-sm">
                {bankQuestion.notes && (
                  <div>
                    <p className="mb-1 font-medium">Notes</p>
                    <p className="whitespace-pre-line text-muted">{bankQuestion.notes}</p>
                  </div>
                )}
                {linkedStories.map((s) => (
                  <div key={s.id}>
                    <p className="mb-1 font-medium">Story: {s.title}</p>
                    <ul className="space-y-1 text-muted">
                      {s.situation && <li><strong className="text-ink">S</strong> {s.situation}</li>}
                      {s.action && <li><strong className="text-ink">A</strong> {s.action}</li>}
                      {s.result && <li><strong className="text-ink">R</strong> {s.result}</li>}
                    </ul>
                  </div>
                ))}
                {bankQuestion.answer && (
                  <div>
                    <p className="mb-1 font-medium">Your saved answer</p>
                    <p className="whitespace-pre-line text-muted">{bankQuestion.answer}</p>
                  </div>
                )}
              </div>
            </Collapsible>
          )}
        </>
      )}

      {phase === "review" && attempt && (
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-sm font-medium text-pine-text">Answer recorded</p>
            <h1 className="text-[1.5rem] font-semibold leading-tight sm:text-[1.75rem]">{current.text}</h1>
            <p className="mt-2 text-sm text-muted">
              Answered in {formatDuration(attempt.durationSec)}, {wordCount(attempt.answer)} words.
            </p>
          </div>

          <Card>
            <CardHeader title="Quick checks" description="Instant signals from your answer. These run on your device." />
            <CardBody className="space-y-5">
              <LocalChecks checks={checks} />
              <div className="border-t border-line pt-4">
                <p className="mb-2 text-sm font-medium">How do you rate this answer?</p>
                <RatingControl value={attempt.selfRating} onChange={(r) => updateAttempt(attempt.id, { selfRating: r })} />
              </div>
              {bankQuestion && bankQuestion.answer.trim() !== attempt.answer.trim() && (
                <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted">
                    {bankQuestion.answer.trim() ? "Happier with this version than your saved answer?" : "You don't have a saved answer for this question yet."}
                  </p>
                  <Button
                    size="sm"
                    icon={<Save className="h-3.5 w-3.5" />}
                    onClick={() => {
                      updateQuestion(bankQuestion.id, { answer: attempt.answer });
                      toast.success("Saved as your answer");
                    }}
                  >
                    Save as my answer
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="AI feedback" description="Optional. Get detailed coaching on this attempt." />
            <CardBody>
              <AnalyzePanel
                question={attempt.questionText}
                category={attempt.category}
                answer={attempt.answer}
                role={context?.role}
                company={context?.company}
                feedback={attempt.feedback}
                onFeedback={(fb) => updateAttempt(attempt.id, { feedback: fb })}
              />
            </CardBody>
          </Card>

          <div className="sticky bottom-16 z-20 -mx-4 flex justify-end border-t border-line bg-bg/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 lg:bottom-4">
            <Button variant="primary" size="lg" onClick={advance} icon={isLast ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}>
              {isLast ? "Finish session" : "Next question"}
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmEnd}
        onCancel={() => setConfirmEnd(false)}
        tone="primary"
        title="End this session?"
        message="Answers you've already submitted are saved. Remaining questions won't be counted."
        confirmLabel="End session"
        onConfirm={() => {
          setConfirmEnd(false);
          complete();
        }}
      />
    </div>
  );
}

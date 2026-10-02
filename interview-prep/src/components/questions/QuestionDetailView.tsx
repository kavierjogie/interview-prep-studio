"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BookOpenText, Link2, Pencil, Play, Plus, Save, Trash2, Wand2, X } from "lucide-react";
import { estimateSpeakingSec } from "@/lib/local-checks";
import { useStore } from "@/lib/store";
import { useUnsavedGuard } from "@/lib/use-unsaved-guard";
import type { Question, Story } from "@/lib/types";
import { formatDuration, relativeTime, wordCount } from "@/lib/utils";
import { AnalyzePanel } from "@/components/feedback/AnalyzePanel";
import { FeedbackPanel } from "@/components/feedback/FeedbackPanel";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink, IconButton } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Collapsible } from "@/components/ui/Collapsible";
import { EmptyState } from "@/components/ui/EmptyState";
import { Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { CategoryBadge, PracticedIndicator, RatingBadge, RatingControl } from "./QuestionBits";
import { QuestionFormModal } from "./QuestionFormModal";

export function QuestionDetailView() {
  const { id } = useParams<{ id: string }>();
  const { data } = useStore();
  const question = data.questions.find((q) => q.id === id);

  if (!question) {
    return (
      <EmptyState
        title="Question not found"
        description="It may have been deleted, or the link is from another browser. Your data is stored per browser."
        action={<ButtonLink href="/questions">Back to question bank</ButtonLink>}
      />
    );
  }
  return <QuestionDetail key={question.id} question={question} />;
}

function storyAsAnswer(s: Story) {
  return [s.situation, s.task, s.action, s.result].map((x) => x.trim()).filter(Boolean).join(" ");
}

function QuestionDetail({ question }: { question: Question }) {
  const { data, updateQuestion, deleteQuestion, restoreDeleted } = useStore();
  const toast = useToast();
  const router = useRouter();
  const [draft, setDraft] = useState(question.answer);
  const [notes, setNotes] = useState(question.notes);
  const [editing, setEditing] = useState(false);
  const [linking, setLinking] = useState(false);

  const dirty = draft !== question.answer;
  const words = wordCount(draft);
  const linkedStories = useMemo(
    () => question.storyIds.map((sid) => data.stories.find((s) => s.id === sid)).filter((s): s is Story => !!s),
    [question.storyIds, data.stories],
  );
  const attempts = useMemo(
    () => data.attempts.filter((a) => a.questionId === question.id && !a.skipped).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [data.attempts, question.id],
  );
  const jobPrep = question.jobPrepId ? data.jobPreps.find((j) => j.id === question.jobPrepId) : null;

  useUnsavedGuard(dirty);

  const remove = () => {
    const before = data;
    deleteQuestion(question.id);
    toast.success("Question deleted", { label: "Undo", onClick: () => restoreDeleted(before) });
    router.push("/questions");
  };

  const saveAnswer = () => {
    updateQuestion(question.id, { answer: draft.trim() });
    setDraft(draft.trim());
    toast.success("Answer saved");
  };

  return (
    <>
      <PageHeader
        back={{ href: "/questions", label: "Question bank" }}
        title={question.text}
        actions={
          <>
            <IconButton label="Edit question" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
            </IconButton>
            <IconButton label="Delete question" onClick={remove}>
              <Trash2 className="h-4 w-4" />
            </IconButton>
            <ButtonLink href={`/practice?q=${question.id}`} variant="primary" icon={<Play className="h-4 w-4" />}>
              Start practice
            </ButtonLink>
          </>
        }
      />

      <div className="-mt-3 mb-6 flex flex-wrap items-center gap-2">
        <CategoryBadge category={question.category} />
        {question.tags.map((t) => (
          <Badge key={t}>#{t}</Badge>
        ))}
        {jobPrep && (
          <Link href={`/prepare/${jobPrep.id}`}>
            <Badge tone="sky">
              {jobPrep.company || "Job prep"}
              {jobPrep.role ? `: ${jobPrep.role}` : ""}
            </Badge>
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader
              title="Your answer"
              description={draft.trim() ? `${words} words, about ${formatDuration(estimateSpeakingSec(draft))} spoken` : "Write the answer you'd like to give."}
              action={dirty ? <Badge tone="marigold">Unsaved</Badge> : null}
            />
            <CardBody className="space-y-3">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="min-h-56 text-[0.96875rem]"
                placeholder="Situation → Task → Action → Result. Write it the way you'd say it."
                aria-label="Your answer"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="primary" icon={<Save className="h-4 w-4" />} disabled={!dirty} onClick={saveAnswer}>
                  Save answer
                </Button>
                {dirty && (
                  <Button variant="ghost" onClick={() => setDraft(question.answer)}>
                    Discard changes
                  </Button>
                )}
                {!draft.trim() && linkedStories[0] && (
                  <Button variant="subtle" icon={<Wand2 className="h-4 w-4" />} onClick={() => setDraft(storyAsAnswer(linkedStories[0]))}>
                    Start from “{linkedStories[0].title}”
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="AI feedback" description="Structured coaching on the answer above, including STAR analysis and likely follow-ups." />
            <CardBody>
              <AnalyzePanel
                question={question.text}
                category={question.category}
                answer={draft}
                role={jobPrep?.role}
                company={jobPrep?.company}
                feedback={question.lastFeedback}
                onFeedback={(fb) => {
                  updateQuestion(question.id, { lastFeedback: fb });
                  toast.success("Feedback ready");
                }}
                onUseSuggested={(text) => {
                  setDraft(text);
                  toast.info("Suggested version copied into your answer. Review it, then save.");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Practice history" description={attempts.length ? `${attempts.length} attempt${attempts.length === 1 ? "" : "s"}` : undefined} />
            <CardBody>
              {attempts.length === 0 ? (
                <p className="text-sm text-muted">You haven&apos;t practised this question yet. Practice attempts and their feedback appear here.</p>
              ) : (
                <div className="space-y-2">
                  {attempts.slice(0, 10).map((a) => (
                    <Collapsible
                      key={a.id}
                      title={
                        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>{relativeTime(a.createdAt)}</span>
                          <span className="text-xs font-normal text-muted">
                            {formatDuration(a.durationSec)}, {wordCount(a.answer)} words
                          </span>
                          <RatingBadge rating={a.selfRating} />
                          {a.feedback && <Badge tone="sky">AI feedback</Badge>}
                        </span>
                      }
                    >
                      <p className="whitespace-pre-line text-sm leading-relaxed">{a.answer || "No answer text recorded."}</p>
                      {a.feedback && (
                        <div className="mt-4 border-t border-line pt-4">
                          <FeedbackPanel feedback={a.feedback} />
                        </div>
                      )}
                    </Collapsible>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardBody className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium">How strong is this answer?</p>
                <RatingControl value={question.rating} onChange={(rating) => updateQuestion(question.id, { rating })} size="sm" />
              </div>
              <div className="flex items-center justify-between border-t border-line pt-4">
                <div>
                  <PracticedIndicator question={question} />
                  <p className="mt-0.5 text-xs text-faint">Last practised: {relativeTime(question.lastPracticedAt)}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => updateQuestion(question.id, { practiced: !question.practiced })}>
                  {question.practiced ? "Mark unpractised" : "Mark practised"}
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Related STAR stories"
              action={
                <Button size="sm" variant="ghost" icon={<Link2 className="h-3.5 w-3.5" />} onClick={() => setLinking(true)}>
                  Link
                </Button>
              }
            />
            <CardBody className="space-y-2">
              {linkedStories.length === 0 ? (
                <p className="text-sm text-muted">
                  Link a story from your library to use as the example for this answer.{" "}
                  <Link href="/stories/new" className="font-medium text-pine-text underline-offset-2 hover:underline">
                    Create a story
                  </Link>
                </p>
              ) : (
                linkedStories.map((s) => (
                  <div key={s.id} className="group flex items-start gap-2 rounded-xl border border-line p-3">
                    <BookOpenText className="mt-0.5 h-4 w-4 shrink-0 text-pine" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/stories/${s.id}`} className="text-sm font-medium hover:underline">
                        {s.title}
                      </Link>
                      {s.result && <p className="mt-0.5 line-clamp-2 text-xs text-muted">Result: {s.result}</p>}
                    </div>
                    <button
                      type="button"
                      aria-label={`Unlink ${s.title}`}
                      onClick={() => updateQuestion(question.id, { storyIds: question.storyIds.filter((x) => x !== s.id) })}
                      className="rounded p-0.5 text-faint hover:bg-sunken hover:text-ink"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Notes" description="Reminders, key points, things to avoid." />
            <CardBody>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => {
                  if (notes !== question.notes) {
                    updateQuestion(question.id, { notes });
                    toast.success("Notes saved");
                  }
                }}
                placeholder="e.g. Mention the 84% result. Keep under 2 minutes."
                aria-label="Notes"
              />
              <p className="mt-1.5 text-xs text-faint">Saved automatically when you click away.</p>
            </CardBody>
          </Card>
        </aside>
      </div>

      <QuestionFormModal
        open={editing}
        onClose={() => setEditing(false)}
        initial={question}
        existingTexts={data.questions.map((q) => q.text)}
        onSubmit={(v) => {
          updateQuestion(question.id, { text: v.text, category: v.category, tags: v.tags });
          setEditing(false);
          toast.success("Question updated");
        }}
      />

      <StoryLinkModal
        open={linking}
        onClose={() => setLinking(false)}
        stories={data.stories}
        selected={question.storyIds}
        onSave={(ids) => {
          updateQuestion(question.id, { storyIds: ids });
          setLinking(false);
          toast.success("Linked stories updated");
        }}
      />
    </>
  );
}

function StoryLinkModal({
  open,
  onClose,
  stories,
  selected,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  stories: Story[];
  selected: string[];
  onSave: (ids: string[]) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Link STAR stories" description="Pick the stories you could use to answer this question.">
      {open && <StoryLinkForm stories={stories} initial={selected} onSave={onSave} onCancel={onClose} />}
    </Modal>
  );
}

function StoryLinkForm({ stories, initial, onSave, onCancel }: { stories: Story[]; initial: string[]; onSave: (ids: string[]) => void; onCancel: () => void }) {
  const [sel, setSel] = useState<string[]>(initial);
  if (stories.length === 0) {
    return (
      <EmptyState
        title="No stories yet"
        description="Create reusable STAR stories from university, work or projects, then link them to questions."
        action={<ButtonLink href="/stories/new" variant="primary" icon={<Plus className="h-4 w-4" />}>Create a story</ButtonLink>}
      />
    );
  }
  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {stories.map((s) => (
          <li key={s.id}>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3 hover:bg-surface-2">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-[var(--pine)]"
                checked={sel.includes(s.id)}
                onChange={() => setSel((x) => (x.includes(s.id) ? x.filter((y) => y !== s.id) : [...x, s.id]))}
              />
              <span>
                <span className="block text-[0.9375rem] font-medium">{s.title}</span>
                <span className="text-[0.8125rem] text-muted">{s.tags.join(", ") || s.context}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="primary" onClick={() => onSave(sel)}>
          Save links
        </Button>
      </div>
    </div>
  );
}

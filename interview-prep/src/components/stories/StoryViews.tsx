"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BookOpenText, Copy, Pencil, Play, Plus, Search, Trash2 } from "lucide-react";
import { getCategory, STORY_CONTEXTS } from "@/lib/categories";
import { estimateSpeakingSec } from "@/lib/local-checks";
import { useStore } from "@/lib/store";
import type { Story } from "@/lib/types";
import { cn, formatDuration } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink, IconButton } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { STAR_STEPS, StoryEditor } from "./StoryEditor";

function useStoryQuestionCounts() {
  const { data } = useStore();
  return useMemo(() => {
    const m = new Map<string, number>();
    data.questions.forEach((q) => q.storyIds.forEach((id) => m.set(id, (m.get(id) ?? 0) + 1)));
    return m;
  }, [data.questions]);
}

/* ---------------- List ---------------- */

export function StoriesView() {
  const { data } = useStore();
  const counts = useStoryQuestionCounts();
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [context, setContext] = useState("all");

  const allTags = useMemo(() => [...new Set(data.stories.flatMap((s) => s.tags))].sort(), [data.stories]);
  const coveredQuestions = data.questions.filter((q) => q.storyIds.length > 0).length;
  const uncoveredBehavioural = data.questions.filter((q) => getCategory(q.category).behavioural && q.storyIds.length === 0).length;

  const filtered = data.stories.filter((s) => {
    const term = query.trim().toLowerCase();
    return (
      (!tag || s.tags.includes(tag)) &&
      (context === "all" || s.context === context) &&
      (!term || [s.title, s.description, s.situation, s.action, s.result, ...s.skills].some((x) => x.toLowerCase().includes(term)))
    );
  });

  return (
    <>
      <PageHeader
        title="STAR stories"
        description="Your personal library of real examples from university, work, projects and volunteering. One good story can answer several questions."
        actions={
          <ButtonLink href="/stories/new" variant="primary" icon={<Plus className="h-4 w-4" />}>
            New story
          </ButtonLink>
        }
      />

      {data.stories.length === 0 ? (
        <EmptyState
          icon={<BookOpenText className="h-8 w-8" />}
          title="Start your story library"
          description="Think of a group project, a part-time job, a hackathon or a time something went wrong. Write it once with STAR, then reuse it across questions."
          action={<ButtonLink href="/stories/new" variant="primary" icon={<Plus className="h-4 w-4" />}>Create your first story</ButtonLink>}
        />
      ) : (
        <>
          <Card className="mb-6">
            <CardBody className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:gap-6">
              <p className="text-[15px]">
                <span className="font-display text-xl font-semibold">{data.stories.length}</span>{" "}
                {data.stories.length === 1 ? "story covers" : "stories cover"}{" "}
                <span className="font-display text-xl font-semibold">{coveredQuestions}</span> questions in your bank.
              </p>
              {uncoveredBehavioural > 0 && (
                <p className="text-sm text-muted sm:ml-auto">
                  {uncoveredBehavioural} behavioural question{uncoveredBehavioural === 1 ? " doesn't" : "s don't"} have a story linked yet.
                </p>
              )}
            </CardBody>
          </Card>

          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search stories" className="pl-9" aria-label="Search stories" />
            </div>
            <Select value={context} onChange={(e) => setContext(e.target.value)} className="sm:w-48" aria-label="Filter by where it happened">
              <option value="all">Anywhere</option>
              {STORY_CONTEXTS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </div>
          {allTags.length > 0 && (
            <div className="-mx-4 mb-5 flex gap-1.5 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter by tag">
              {allTags.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={tag === t}
                  onClick={() => setTag(tag === t ? null : t)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1 text-[13px] font-medium",
                    tag === t ? "border-ink bg-ink text-surface" : "border-line bg-surface text-muted hover:text-ink",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          {filtered.length === 0 ? (
            <EmptyState title="No stories match" description="Try a different search, tag or place." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((s) => (
                <StoryCard key={s.id} story={s} questionCount={counts.get(s.id) ?? 0} />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

function StarDots({ story }: { story: Story }) {
  return (
    <span className="flex gap-1" aria-label="STAR completeness">
      {STAR_STEPS.map((s) => {
        const filled = story[s.key].trim().length > 0;
        return (
          <span
            key={s.key}
            title={`${s.title}: ${filled ? "written" : "empty"}`}
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-md font-display text-[11px] font-bold",
              filled ? "bg-pine-soft text-pine-text" : "bg-sunken text-faint",
            )}
          >
            {s.letter}
          </span>
        );
      })}
    </span>
  );
}

function StoryCard({ story, questionCount }: { story: Story; questionCount: number }) {
  return (
    <Link href={`/stories/${story.id}`} className="group flex flex-col rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong">
      <div className="flex items-center justify-between gap-3">
        <Badge tone="outline">{story.context}</Badge>
        <StarDots story={story} />
      </div>
      <h3 className="mt-3 text-[17px] font-semibold leading-snug group-hover:underline group-hover:underline-offset-2">{story.title}</h3>
      {story.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{story.description}</p>}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {story.tags.slice(0, 4).map((t) => (
          <Badge key={t}>{t}</Badge>
        ))}
      </div>
      <p className="mt-auto pt-4 text-[13px] font-medium text-pine-text">
        {questionCount === 0 ? <span className="text-faint">Not linked to any questions</span> : `Answers ${questionCount} question${questionCount === 1 ? "" : "s"}`}
      </p>
    </Link>
  );
}

/* ---------------- New ---------------- */

export function NewStoryView() {
  const router = useRouter();
  const toast = useToast();
  return (
    <>
      <PageHeader
        back={{ href: "/stories", label: "STAR stories" }}
        title="New STAR story"
        description="Write it once in the order you'd tell it. You can link it to as many questions as it fits."
      />
      <StoryEditor
        onCancel={() => router.push("/stories")}
        onSaved={(s) => {
          toast.success("Story created");
          router.push(`/stories/${s.id}`);
        }}
      />
    </>
  );
}

/* ---------------- Detail ---------------- */

export function StoryDetailView() {
  const { id } = useParams<{ id: string }>();
  const { data, deleteStory } = useStore();
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const story = data.stories.find((s) => s.id === id);

  if (!story) {
    return (
      <EmptyState
        title="Story not found"
        description="It may have been deleted, or the link is from another browser."
        action={<ButtonLink href="/stories">Back to stories</ButtonLink>}
      />
    );
  }

  if (editing) {
    return (
      <>
        <PageHeader back={{ href: "/stories", label: "STAR stories" }} title={`Edit “${story.title}”`} />
        <StoryEditor
          key={story.id}
          initial={story}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            toast.success("Story saved");
          }}
        />
      </>
    );
  }

  const questions = data.questions.filter((q) => q.storyIds.includes(story.id));
  const asAnswer = STAR_STEPS.map((s) => story[s.key].trim()).filter(Boolean).join(" ");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(asAnswer);
      toast.success("Story copied");
    } catch {
      toast.error("Couldn't copy to the clipboard.");
    }
  };

  return (
    <>
      <PageHeader
        back={{ href: "/stories", label: "STAR stories" }}
        title={story.title}
        description={story.description || undefined}
        actions={
          <>
            <IconButton label="Delete story" onClick={() => setConfirm(true)}>
              <Trash2 className="h-4 w-4" />
            </IconButton>
            <Button variant="primary" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditing(true)}>
              Edit story
            </Button>
          </>
        }
      />
      <div className="-mt-3 mb-6 flex flex-wrap gap-2">
        <Badge tone="outline">{story.context}</Badge>
        {story.tags.map((t) => (
          <Badge key={t} tone="pine">
            {t}
          </Badge>
        ))}
        {story.skills.map((t) => (
          <Badge key={t}>{t}</Badge>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardBody>
            <ol className="space-y-6">
              {STAR_STEPS.map((step) => (
                <li key={step.key} className="flex gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pine font-display text-[15px] font-bold text-pine-ink">
                    {step.letter}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-semibold">{step.title}</h3>
                    {story[step.key].trim() ? (
                      <p className="mt-1 max-w-prose whitespace-pre-line leading-relaxed">{story[step.key]}</p>
                    ) : (
                      <p className="mt-1 text-sm text-faint">
                        Not written yet.{" "}
                        <button type="button" className="font-medium text-pine-text hover:underline" onClick={() => setEditing(true)}>
                          Add it
                        </button>
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
            {asAnswer && (
              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-4 text-sm text-muted">
                About {formatDuration(estimateSpeakingSec(asAnswer))} when spoken.
                <Button size="sm" icon={<Copy className="h-3.5 w-3.5" />} onClick={copy}>
                  Copy as one answer
                </Button>
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="self-start">
          <CardHeader title="Questions it answers" description={questions.length ? undefined : "Link questions by editing the story."} />
          <CardBody>
            {questions.length === 0 ? (
              <Button size="sm" onClick={() => setEditing(true)}>
                Link questions
              </Button>
            ) : (
              <ul className="space-y-1">
                {questions.map((q) => (
                  <li key={q.id} className="group flex items-start gap-2 rounded-lg p-2 hover:bg-surface-2">
                    <Link href={`/questions/${q.id}`} className="min-w-0 flex-1 text-sm leading-snug hover:underline">
                      {q.text}
                    </Link>
                    <Link href={`/practice?q=${q.id}`} aria-label={`Practise ${q.text}`} className="rounded-md p-1 text-pine-text hover:bg-pine-soft">
                      <Play className="h-3.5 w-3.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <ConfirmDialog
        open={confirm}
        onCancel={() => setConfirm(false)}
        title="Delete this story?"
        message={`“${story.title}” will be removed and unlinked from ${questions.length} question${questions.length === 1 ? "" : "s"}. Your questions and answers are kept.`}
        confirmLabel="Delete story"
        onConfirm={() => {
          deleteStory(story.id);
          toast.success("Story deleted");
          router.push("/stories");
        }}
      />
    </>
  );
}

"use client";

import { useMemo, useState, type FormEvent } from "react";
import { STORY_CONTEXTS, STORY_TAGS } from "@/lib/categories";
import { estimateSpeakingSec } from "@/lib/local-checks";
import { useStore, type StoryInput } from "@/lib/store";
import type { CategoryId, Story, StoryContext } from "@/lib/types";
import { cn, formatDuration, wordCount } from "@/lib/utils";
import { QuestionPicker } from "@/components/questions/QuestionPicker";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { TagInput } from "@/components/ui/TagInput";

export const STAR_STEPS = [
  {
    key: "situation",
    letter: "S",
    title: "Situation",
    prompt: "Where were you and what was going on? Keep it to one or two sentences of context.",
    placeholder: "e.g. In my final-year group project, our model was stuck at 61% accuracy two weeks before the deadline…",
  },
  {
    key: "task",
    letter: "T",
    title: "Task",
    prompt: "What were you responsible for, or what needed to happen?",
    placeholder: "e.g. I owned the training pipeline and wanted to get the team to the 80% target…",
  },
  {
    key: "action",
    letter: "A",
    title: "Action",
    prompt: "What did you do? Use 'I', be specific, and spend most of your answer here.",
    placeholder: "e.g. I set up a shared experiment log, wrote a script to test each change separately…",
  },
  {
    key: "result",
    letter: "R",
    title: "Result",
    prompt: "What happened because of your actions? Use numbers if you can, and what you learned.",
    placeholder: "e.g. Accuracy rose to 84%, we submitted two days early and…",
  },
] as const;

/** Maps story tags to the question categories they're most likely to answer. */
export const TAG_TO_CATEGORIES: Record<string, CategoryId[]> = {
  Teamwork: ["teamwork", "behavioural"],
  "Problem Solving": ["problem-solving", "technical"],
  Leadership: ["leadership"],
  Ownership: ["leadership"],
  Initiative: ["leadership"],
  Communication: ["behavioural", "teamwork"],
  Adaptability: ["behavioural", "setbacks"],
  Conflict: ["conflict"],
  "Time Management": ["behavioural"],
  Persistence: ["setbacks"],
  Learning: ["setbacks", "strengths-weaknesses"],
  "Attention to Detail": ["behavioural"],
};

export function StoryEditor({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: Story;
  onSaved: (story: Story) => void;
  onCancel: () => void;
}) {
  const { data, addStory, updateStory, setStoryQuestions } = useStore();
  const [form, setForm] = useState<StoryInput>({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    context: initial?.context ?? "University",
    situation: initial?.situation ?? "",
    task: initial?.task ?? "",
    action: initial?.action ?? "",
    result: initial?.result ?? "",
    skills: initial?.skills ?? [],
    tags: initial?.tags ?? [],
  });
  const [questionIds, setQuestionIds] = useState<string[]>(() =>
    initial ? data.questions.filter((q) => q.storyIds.includes(initial.id)).map((q) => q.id) : [],
  );
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof StoryInput>(key: K, value: StoryInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  };

  const fullText = [form.situation, form.task, form.action, form.result].join(" ");
  const totalWords = wordCount(fullText);
  const highlight = useMemo(() => [...new Set(form.tags.flatMap((t) => TAG_TO_CATEGORIES[t] ?? []))], [form.tags]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Give your story a short title so you can find it later.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (![form.situation, form.task, form.action, form.result].some((x) => x.trim())) {
      setError("Fill in at least one part of the STAR structure.");
      return;
    }
    const clean: StoryInput = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      situation: form.situation.trim(),
      task: form.task.trim(),
      action: form.action.trim(),
      result: form.result.trim(),
    };
    if (initial) {
      updateStory(initial.id, clean);
      setStoryQuestions(initial.id, questionIds);
      onSaved({ ...initial, ...clean });
    } else {
      const story = addStory(clean, questionIds);
      onSaved(story);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      {error && (
        <p role="alert" className="rounded-xl bg-rose-soft px-4 py-3 text-sm text-rose-text">
          {error}
        </p>
      )}

      <Card>
        <CardHeader title="The basics" />
        <CardBody className="grid gap-4 sm:grid-cols-[1fr_200px]">
          <Field label="Title" htmlFor="s-title">
            <Input id="s-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Neural network group project" maxLength={120} />
          </Field>
          <Field label="Where it happened" htmlFor="s-context">
            <Select id="s-context" value={form.context} onChange={(e) => set("context", e.target.value as StoryContext)}>
              {STORY_CONTEXTS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="One-line summary" htmlFor="s-desc" optional className="sm:col-span-2">
            <Input id="s-desc" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What this story is about, in a sentence" maxLength={300} />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Build it with STAR"
          description={totalWords > 0 ? `${totalWords} words, about ${formatDuration(estimateSpeakingSec(fullText))} when spoken. Aim for 1.5–2 minutes.` : "Work through each part in order."}
        />
        <CardBody>
          <ol className="relative space-y-5">
            {STAR_STEPS.map((step, i) => {
              const value = form[step.key];
              const filled = value.trim().length > 0;
              return (
                <li key={step.key} className="relative flex gap-4">
                  {i < STAR_STEPS.length - 1 && <span className="absolute left-[17px] top-10 h-[calc(100%-12px)] w-px bg-line" aria-hidden="true" />}
                  <span
                    className={cn(
                      "z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-[15px] font-bold transition-colors",
                      filled ? "bg-pine text-pine-ink" : "border border-line-strong bg-surface text-muted",
                    )}
                    aria-hidden="true"
                  >
                    {step.letter}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1.5 pb-1">
                    <label htmlFor={`s-${step.key}`} className="block font-display text-base font-semibold">
                      {step.title}
                    </label>
                    <p className="text-[13px] text-muted">{step.prompt}</p>
                    <Textarea
                      id={`s-${step.key}`}
                      value={value}
                      onChange={(e) => set(step.key, e.target.value)}
                      placeholder={step.placeholder}
                      className={step.key === "action" ? "min-h-32" : "min-h-20"}
                    />
                    {filled && <p className="text-right text-xs text-faint">{wordCount(value)} words</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Skills and tags" description="Tags help you match this story to questions." />
        <CardBody className="space-y-4">
          <Field label="Tags" htmlFor="s-tags">
            <TagInput id="s-tags" value={form.tags} onChange={(v) => set("tags", v)} suggestions={STORY_TAGS} />
          </Field>
          <Field label="Skills shown" htmlFor="s-skills" optional hint="Technical or soft skills, e.g. Python, Stakeholder management.">
            <TagInput id="s-skills" value={form.skills} onChange={(v) => set("skills", v)} placeholder="Add a skill and press Enter" />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Questions this story can answer"
          description="One strong story usually works for several questions. Questions matching your tags are listed first."
        />
        <CardBody>
          {data.questions.length === 0 ? (
            <p className="text-sm text-muted">Add questions to your question bank first, then link them here.</p>
          ) : (
            <QuestionPicker questions={data.questions} selected={questionIds} onChange={setQuestionIds} highlightCategories={highlight} />
          )}
        </CardBody>
      </Card>

      <div className="sticky bottom-16 z-20 -mx-4 flex justify-end gap-2 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border lg:bottom-4">
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary">
          {initial ? "Save story" : "Create story"}
        </Button>
      </div>
    </form>
  );
}

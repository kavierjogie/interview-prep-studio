"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { BookOpenText, FileText, Library, Play, Plus, Search } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { useStore } from "@/lib/store";
import type { CategoryId, Question } from "@/lib/types";
import { isCategoryId as isCategory } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toast";
import { CategoryBadge, PracticedIndicator, RatingBadge } from "./QuestionBits";
import { QuestionFormModal } from "./QuestionFormModal";

type StatusFilter = "all" | "unpractised" | "needs-work" | "strong" | "no-answer";
const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unpractised", label: "Not practised" },
  { value: "needs-work", label: "Needs improvement" },
  { value: "strong", label: "Strong" },
  { value: "no-answer", label: "No answer" },
];

function matchesStatus(q: Question, s: StatusFilter) {
  switch (s) {
    case "unpractised":
      return !q.practiced;
    case "needs-work":
      return q.rating === "needs-work";
    case "strong":
      return q.rating === "strong";
    case "no-answer":
      return !q.answer.trim();
    default:
      return true;
  }
}

export function QuestionBankView() {
  const { data, addQuestion } = useStore();
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const initialCat = params.get("category");
  const initialStatus = params.get("status") as StatusFilter | null;

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryId | "all">(isCategory(initialCat) ? initialCat : "all");
  const [status, setStatus] = useState<StatusFilter>(STATUS_OPTIONS.some((o) => o.value === initialStatus) ? initialStatus! : "all");
  const [adding, setAdding] = useState(false);

  const counts = useMemo(() => {
    const m = new Map<CategoryId, number>();
    data.questions.forEach((q) => m.set(q.category, (m.get(q.category) ?? 0) + 1));
    return m;
  }, [data.questions]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return data.questions
      .filter((q) => category === "all" || q.category === category)
      .filter((q) => matchesStatus(q, status))
      .filter(
        (q) =>
          !term ||
          q.text.toLowerCase().includes(term) ||
          q.answer.toLowerCase().includes(term) ||
          q.notes.toLowerCase().includes(term) ||
          q.tags.some((t) => t.toLowerCase().includes(term)),
      )
      .sort((a, b) => {
        const ca = CATEGORIES.findIndex((c) => c.id === a.category);
        const cb = CATEGORIES.findIndex((c) => c.id === b.category);
        return ca - cb || a.text.localeCompare(b.text);
      });
  }, [data.questions, category, status, query]);

  const filtersActive = query || category !== "all" || status !== "all";

  return (
    <>
      <PageHeader
        title="Question bank"
        description="Every question you're preparing for, with your answers, notes and linked stories."
        actions={
          <>
            {filtered.length > 0 && (
              <ButtonLink
                href={`/practice?${category !== "all" ? `category=${category}` : "mode=random"}`}
                icon={<Play className="h-4 w-4" />}
              >
                Practise {category !== "all" ? "this category" : ""}
              </ButtonLink>
            )}
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setAdding(true)}>
              Add question
            </Button>
          </>
        }
      />

      {data.questions.length === 0 ? (
        <EmptyState
          icon={<Library className="h-8 w-8" />}
          title="Your question bank is empty"
          description="Add the questions you expect to be asked, or create a job preparation session to generate questions from a job description."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setAdding(true)}>
                Add question
              </Button>
              <ButtonLink href="/prepare">Prepare for a job</ButtonLink>
            </div>
          }
        />
      ) : (
        <>
          <div className="space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search questions, answers, notes and tags" className="pl-9" aria-label="Search" />
              </div>
              <Segmented label="Filter by status" options={STATUS_OPTIONS} value={status} onChange={setStatus} size="sm" />
            </div>
            <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter by category">
              <CategoryChip active={category === "all"} onClick={() => setCategory("all")} label="All" count={data.questions.length} />
              {CATEGORIES.filter((c) => counts.get(c.id)).map((c) => (
                <CategoryChip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)} label={c.label} count={counts.get(c.id) ?? 0} />
              ))}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between text-[0.8125rem] text-muted">
            <span>
              Showing {filtered.length} of {data.questions.length}
            </span>
            {filtersActive && (
              <button type="button" className="hover:text-ink" onClick={() => { setQuery(""); setCategory("all"); setStatus("all"); }}>
                Clear filters
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <EmptyState className="mt-3" title="No questions match these filters" description="Try a different search or clear the filters." />
          ) : (
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
              {filtered.map((q) => (
                <QuestionRow key={q.id} q={q} />
              ))}
            </ul>
          )}
        </>
      )}

      <QuestionFormModal
        open={adding}
        onClose={() => setAdding(false)}
        existingTexts={data.questions.map((q) => q.text)}
        onSubmit={(v) => {
          const q = addQuestion({ text: v.text, category: v.category, tags: v.tags, answer: v.answer });
          setAdding(false);
          toast.success("Question added");
          router.push(`/questions/${q.id}`);
        }}
      />
    </>
  );
}

function CategoryChip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[0.8125rem] font-medium press",
        active ? "border-ink bg-ink text-surface" : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink",
      )}
    >
      {label}
      <span className={cn("tabular-nums", active ? "opacity-70" : "text-faint")}>{count}</span>
    </button>
  );
}

function QuestionRow({ q }: { q: Question }) {
  return (
    <li className="group relative flex items-start gap-4 px-4 py-3.5 hover:bg-surface-2 active:bg-sunken sm:px-5">
      <div className="min-w-0 flex-1">
        <Link href={`/questions/${q.id}`} className="text-[0.96875rem] font-medium leading-snug after:absolute after:inset-0">
          {q.text}
        </Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <CategoryBadge category={q.category} short />
          <PracticedIndicator question={q} />
          <span className={cn("inline-flex items-center gap-1 text-xs", q.answer.trim() ? "text-muted" : "text-faint")}>
            <FileText className="h-3.5 w-3.5" />
            {q.answer.trim() ? "Answer saved" : "No answer yet"}
          </span>
          {q.storyIds.length > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <BookOpenText className="h-3.5 w-3.5" />
              {q.storyIds.length} {q.storyIds.length === 1 ? "story" : "stories"}
            </span>
          )}
          <RatingBadge rating={q.rating} />
        </div>
      </div>
      <Link
        href={`/practice?q=${q.id}`}
        aria-label={`Practise: ${q.text}`}
        className="relative z-10 hidden h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[0.8125rem] font-medium text-pine-text hover:bg-pine-soft sm:inline-flex"
      >
        <Play className="h-3.5 w-3.5" /> Practise
      </Link>
    </li>
  );
}

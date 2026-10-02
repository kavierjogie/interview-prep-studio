"use client";

import { CheckCircle2, Circle, Star, TrendingUp } from "lucide-react";
import { getCategory } from "@/lib/categories";
import type { AnswerRating, CategoryId, Question } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

export function CategoryBadge({ category, short = false }: { category: CategoryId; short?: boolean }) {
  const c = getCategory(category);
  return <Badge tone="outline">{short ? c.short : c.label}</Badge>;
}

export function RatingBadge({ rating }: { rating: AnswerRating | null }) {
  if (rating === "strong") return <Badge tone="pine" icon={<Star className="h-3 w-3" />}>Strong</Badge>;
  if (rating === "needs-work") return <Badge tone="marigold" icon={<TrendingUp className="h-3 w-3" />}>Needs improvement</Badge>;
  return null;
}

export function PracticedIndicator({ question }: { question: Question }) {
  return question.practiced ? (
    <span className="inline-flex items-center gap-1 text-xs text-pine-text">
      <CheckCircle2 className="h-3.5 w-3.5" /> Practised {question.practiceCount > 1 ? `×${question.practiceCount}` : ""}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-faint">
      <Circle className="h-3.5 w-3.5" /> Not practised
    </span>
  );
}

export function RatingControl({ value, onChange, size = "md" }: { value: AnswerRating | null; onChange: (v: AnswerRating | null) => void; size?: "sm" | "md" }) {
  const opts: { v: AnswerRating; label: string; Icon: typeof Star; on: string }[] = [
    { v: "strong", label: "Strong", Icon: Star, on: "border-pine bg-pine-soft text-pine-text" },
    { v: "needs-work", label: "Needs improvement", Icon: TrendingUp, on: "border-marigold bg-marigold-soft text-marigold-text" },
  ];
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Rate this answer">
      {opts.map(({ v, label, Icon, on }) => {
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? null : v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border font-medium press",
              size === "sm" ? "h-8 px-3 text-[0.8125rem]" : "h-9 px-3.5 text-sm",
              active ? on : "border-line-strong text-muted hover:text-ink",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

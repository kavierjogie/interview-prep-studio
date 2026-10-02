"use client";

import Link from "next/link";
import { Flame, Play } from "lucide-react";
import type { CategoryStat, DayActivity, Readiness, Recommendation, StreakInfo } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { ProgressBar, ProgressRing } from "@/components/ui/Progress";
import { getCategory } from "@/lib/categories";

export function ReadinessBlock({ readiness, size = 132 }: { readiness: Readiness; size?: number }) {
  const rows = [
    { label: "Have a saved answer", value: readiness.answered },
    { label: "Practised", value: readiness.practiced },
    { label: "Rated strong", value: readiness.strong },
  ];
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
      <ProgressRing value={readiness.percent} size={size} stroke={11} label={`Interview readiness ${readiness.percent}%`}>
        <span className="font-display text-[2.125rem] font-semibold leading-none tabular-nums">{readiness.percent}%</span>
        <span className="mt-1 text-xs text-muted">ready</span>
      </ProgressRing>
      <div className="min-w-0 flex-1 space-y-3">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="mb-1 flex justify-between text-sm">
              <span>{r.label}</span>
              <span className="tabular-nums text-muted">
                {r.value} / {readiness.total}
              </span>
            </div>
            <ProgressBar value={r.value} max={readiness.total} label={r.label} />
          </div>
        ))}
        <p className="text-xs text-faint">Readiness counts one point each for a saved answer, practice and a strong rating, across every question in your bank.</p>
      </div>
    </div>
  );
}

export function StreakBlock({ streak }: { streak: StreakInfo }) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", streak.current > 0 ? "bg-marigold-soft text-marigold" : "bg-sunken text-faint")}>
        <Flame className="h-5 w-5" />
      </span>
      <div>
        <p className="font-display text-2xl font-semibold leading-tight">
          {streak.current} day{streak.current === 1 ? "" : "s"}
        </p>
        <p className="text-[0.8125rem] text-muted">
          {streak.practicedToday ? "Practised today" : streak.current > 0 ? "Practise today to keep it going" : "Practise today to start a streak"}
          {streak.longest > streak.current ? `. Best: ${streak.longest}` : ""}
        </p>
      </div>
    </div>
  );
}

export function ActivityGrid({ days }: { days: DayActivity[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const level = (c: number) => (c === 0 ? 0 : Math.ceil((c / max) * 3));
  const colors = ["bg-sunken", "bg-pine/35", "bg-pine/65", "bg-pine"];
  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2" role="img" aria-label={`Practice activity over the last ${days.length} days`}>
        {days.map((d) => (
          <div
            key={d.key}
            title={`${d.date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}: ${d.count} answer${d.count === 1 ? "" : "s"}`}
            className={cn("aspect-square rounded-md", colors[level(d.count)])}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-faint">
        <span>{days[0]?.date.toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

export function RecommendationList({ items, compact = false }: { items: Recommendation[]; compact?: boolean }) {
  if (items.length === 0) return <p className="text-sm text-muted">Everything in your bank is practised and rated strong. Add new questions or run a mock interview.</p>;
  return (
    <ul className="divide-y divide-line">
      {items.map((r) => (
        <li key={r.question.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
          <div className="min-w-0 flex-1">
            <Link href={`/questions/${r.question.id}`} className="text-[0.9375rem] font-medium leading-snug hover:underline">
              {r.question.text}
            </Link>
            <p className="mt-0.5 text-[0.8125rem] text-muted">
              {compact ? r.reason : `${getCategory(r.question.category).label}. ${r.reason}`}
            </p>
          </div>
          <Link
            href={`/practice?q=${r.question.id}`}
            aria-label={`Practise: ${r.question.text}`}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[0.8125rem] font-medium text-pine-text hover:bg-pine-soft"
          >
            <Play className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Practise</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function CategoryBars({ stats, limit }: { stats: CategoryStat[]; limit?: number }) {
  const rows = stats.filter((s) => s.total > 0);
  return (
    <ul className="space-y-3.5">
      {(limit ? rows.slice(0, limit) : rows).map((s) => (
        <li key={s.id}>
          <Link href={`/questions?category=${s.id}`} className="group block">
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate group-hover:underline">{s.label}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted">
                {s.practiced}/{s.total} practised{s.needsWork ? `, ${s.needsWork} to improve` : ""}
              </span>
            </div>
            <ProgressBar value={s.readiness} tone={s.readiness < 34 ? "marigold" : "pine"} label={`${s.label} readiness ${s.readiness}%`} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

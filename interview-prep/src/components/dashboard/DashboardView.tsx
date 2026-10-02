"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowUpRight, BookOpenText, Library, Mic, Play } from "lucide-react";
import { computeCategoryStats, computeReadiness, computeStreak, focusAreas, recommendQuestions } from "@/lib/stats";
import { useStore } from "@/lib/store";
import { formatDuration, relativeTime, todayKey } from "@/lib/utils";
import { InterviewCountdown } from "@/components/prepare/JobPrepViews";
import { CategoryBars, ReadinessBlock, RecommendationList, StreakBlock } from "@/components/progress/Widgets";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export function DashboardView() {
  const { data } = useStore();
  const readiness = useMemo(() => computeReadiness(data.questions), [data.questions]);
  const streak = useMemo(() => computeStreak(data.attempts), [data.attempts]);
  const stats = useMemo(() => computeCategoryStats(data), [data]);
  const recs = useMemo(() => recommendQuestions(data.questions, 5), [data.questions]);
  const focus = useMemo(() => focusAreas(stats, 3), [stats]);
  const recent = data.sessions
    .filter((s) => s.attemptIds.length > 0)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, 4);
  const practisedCategories = [...stats].filter((s) => s.attempts > 0).sort((a, b) => b.attempts - a.attempts);
  const upcoming = data.jobPreps
    .filter((j) => j.interviewDate && j.interviewDate >= todayKey())
    .sort((a, b) => (a.interviewDate ?? "").localeCompare(b.interviewDate ?? ""))[0];
  const name = data.settings.displayName.trim();

  return (
    <>
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="mt-1 text-[1.875rem] font-semibold leading-tight sm:text-[2.25rem]">
            {greeting()}
            {name ? `, ${name}` : ""}
          </h1>
          <p className="mt-1.5 text-[0.9375rem] text-muted">
            {recs.length > 0 ? `${recs.length} questions are ready for your next session.` : "Your question bank is in great shape."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/mock" icon={<Mic className="h-4 w-4" />}>
            Start mock interview
          </ButtonLink>
          <ButtonLink href="/practice" variant="primary" icon={<Play className="h-4 w-4" />}>
            Start practice
          </ButtonLink>
        </div>
      </div>

      {upcoming && (
        <Link
          href={`/prepare/${upcoming.id}`}
          className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-sky-text/20 bg-sky-soft px-5 py-3.5 text-sky-text hover:border-sky-text/40"
        >
          <InterviewCountdown date={upcoming.interviewDate} />
          <span className="font-medium">
            {upcoming.role}
            {upcoming.company ? ` at ${upcoming.company}` : ""}
          </span>
          <span className="ml-auto inline-flex items-center gap-1 text-sm">
            Open preparation <ArrowUpRight className="h-4 w-4" />
          </span>
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Interview readiness" action={<ButtonLink href="/progress" size="sm" variant="ghost">Details</ButtonLink>} />
          <CardBody>
            <ReadinessBlock readiness={readiness} />
            <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
              {[
                { label: "Questions practised", value: readiness.practiced, href: "/questions" },
                { label: "Strong answers", value: readiness.strong, href: "/questions?status=strong" },
                { label: "Need improvement", value: readiness.needsWork, href: "/questions?status=needs-work" },
                { label: "Total sessions", value: data.sessions.filter((s) => s.attemptIds.length).length, href: "/progress" },
              ].map((s) => (
                <Link key={s.label} href={s.href} className="bg-surface px-4 py-3 hover:bg-surface-2">
                  <dt className="text-xs text-muted">{s.label}</dt>
                  <dd className="font-display text-2xl font-semibold tabular-nums">{s.value}</dd>
                </Link>
              ))}
            </dl>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardBody>
              <StreakBlock streak={streak} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Needs more preparation" />
            <CardBody>
              {focus.length === 0 ? (
                <p className="text-sm text-muted">No weak spots right now.</p>
              ) : (
                <ul className="space-y-3">
                  {focus.map((f) => (
                    <li key={f.categoryId}>
                      <Link href={`/practice?category=${f.categoryId}`} className="group block">
                        <p className="text-sm font-medium group-hover:underline">{f.label}</p>
                        <p className="text-[0.8125rem] text-muted">{f.reason}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Practise next" description="The questions that will move your readiness most." />
          <CardBody>
            <RecommendationList items={recs} compact />
          </CardBody>
        </Card>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <Link href="/questions" className="rounded-2xl border border-line bg-surface p-4 hover:border-line-strong">
              <Library className="h-5 w-5 text-pine" />
              <p className="mt-3 font-display text-2xl font-semibold">{data.questions.length}</p>
              <p className="text-[0.8125rem] text-muted">Question bank</p>
            </Link>
            <Link href="/stories" className="rounded-2xl border border-line bg-surface p-4 hover:border-line-strong">
              <BookOpenText className="h-5 w-5 text-pine" />
              <p className="mt-3 font-display text-2xl font-semibold">{data.stories.length}</p>
              <p className="text-[0.8125rem] text-muted">STAR stories</p>
            </Link>
          </div>

          <Card>
            <CardHeader title="Recent sessions" />
            <CardBody>
              {recent.length === 0 ? (
                <p className="text-sm text-muted">No practice yet. Your sessions will show up here.</p>
              ) : (
                <ul className="space-y-3">
                  {recent.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        {s.mode === "mock" ? (
                          <Link href={`/mock/${s.id}`} className="block truncate text-sm font-medium hover:underline">
                            {s.label}
                          </Link>
                        ) : (
                          <p className="truncate text-sm font-medium">{s.label}</p>
                        )}
                        <p className="text-xs text-muted">
                          {relativeTime(s.startedAt)}, {s.attemptIds.length} question{s.attemptIds.length === 1 ? "" : "s"}, {formatDuration(s.totalDurationSec)}
                        </p>
                      </div>
                      <Badge tone={s.mode === "mock" ? "sky" : "neutral"}>{s.mode === "mock" ? "Mock" : "Practice"}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {practisedCategories.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Skills you've been practising" description="Readiness by category, most practised first." />
          <CardBody>
            <div className="grid gap-x-10 gap-y-0 md:grid-cols-2">
              <CategoryBars stats={practisedCategories.slice(0, Math.ceil(Math.min(8, practisedCategories.length) / 2))} />
              <div className="mt-3.5 md:mt-0">
                <CategoryBars stats={practisedCategories.slice(Math.ceil(Math.min(8, practisedCategories.length) / 2), 8)} />
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </>
  );
}

"use client";

import Link from "next/link";
import { useMemo } from "react";
import { getCategory } from "@/lib/categories";
import {
  activityByDay,
  attemptsInLastDays,
  computeCategoryStats,
  computeReadiness,
  computeStreak,
  focusAreas,
  recommendQuestions,
  starGaps,
} from "@/lib/stats";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/layout/PageHeader";
import { SessionHistory } from "@/components/practice/SessionHistory";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/Progress";
import { ActivityGrid, CategoryBars, ReadinessBlock, RecommendationList, StreakBlock } from "./Widgets";

export function ProgressView() {
  const { data } = useStore();
  const readiness = useMemo(() => computeReadiness(data.questions), [data.questions]);
  const streak = useMemo(() => computeStreak(data.attempts), [data.attempts]);
  const stats = useMemo(() => computeCategoryStats(data), [data]);
  const recs = useMemo(() => recommendQuestions(data.questions, 6), [data.questions]);
  const focus = useMemo(() => focusAreas(stats, 4), [stats]);
  const gaps = useMemo(() => starGaps(data), [data]);
  const days = useMemo(() => activityByDay(data.attempts, 28), [data.attempts]);
  const week = attemptsInLastDays(data.attempts, 7);
  const goal = data.settings.weeklyGoal;
  const mockCount = data.sessions.filter((s) => s.mode === "mock" && s.attemptIds.length > 0).length;
  const practiceCount = data.sessions.filter((s) => s.mode === "practice" && s.attemptIds.length > 0).length;
  const skippedByCategory = stats.filter((s) => s.skipped > 0).sort((a, b) => b.skipped - a.skipped);
  const feedbackCount = gaps[0]?.total ?? 0;

  return (
    <>
      <PageHeader title="Progress" description="Where you stand, and what to practise next." />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Interview readiness" />
          <CardBody>
            <ReadinessBlock readiness={readiness} />
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-6">
            <StreakBlock streak={streak} />
            <div>
              <div className="mb-1.5 flex justify-between text-sm">
                <span>This week</span>
                <span className="tabular-nums text-muted">
                  {week} of {goal} answers
                </span>
              </div>
              <ProgressBar value={week} max={goal} label="Weekly goal" />
            </div>
            <p className="text-sm text-muted">
              {practiceCount} practice session{practiceCount === 1 ? "" : "s"} and {mockCount} mock interview{mockCount === 1 ? "" : "s"} so far.
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Practise next" description="Ranked by what needs the most work." />
          <CardBody>
            <RecommendationList items={recs} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Last 4 weeks" />
          <CardBody>
            <ActivityGrid days={days} />
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Categories" description="Select one to see its questions." />
          <CardBody>
            <CategoryBars stats={stats} />
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Needs more preparation" />
            <CardBody>
              {focus.length === 0 ? (
                <p className="text-sm text-muted">Every category is in good shape.</p>
              ) : (
                <ul className="space-y-3">
                  {focus.map((f) => (
                    <li key={f.categoryId} className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{f.label}</p>
                        <p className="text-[0.8125rem] text-muted">{f.reason}</p>
                      </div>
                      <Link href={`/practice?category=${f.categoryId}`} className="shrink-0 text-[0.8125rem] font-medium text-pine-text hover:underline">
                        Practise
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Frequently missed"
              description={feedbackCount > 0 ? `STAR gaps across ${feedbackCount} AI-analysed behavioural answer${feedbackCount === 1 ? "" : "s"}.` : undefined}
            />
            <CardBody className="space-y-4">
              {feedbackCount === 0 ? (
                <p className="text-sm text-muted">Analyse a few behavioural answers with AI to see which parts of STAR you tend to skip.</p>
              ) : (
                <ul className="space-y-3">
                  {gaps.map((g) => (
                    <li key={g.element}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{g.label}</span>
                        <span className="text-xs text-muted">
                          {g.weak === 0 ? "Consistently clear" : `Unclear in ${g.weak} of ${g.total}`}
                        </span>
                      </div>
                      <ProgressBar value={g.weak} max={g.total} tone="marigold" label={`${g.label} gaps`} />
                    </li>
                  ))}
                </ul>
              )}
              {skippedByCategory.length > 0 && (
                <p className="border-t border-line pt-4 text-sm text-muted">
                  Most skipped:{" "}
                  {skippedByCategory
                    .slice(0, 3)
                    .map((s) => `${getCategory(s.id).short} (${s.skipped})`)
                    .join(", ")}
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold">All sessions</h2>
        <SessionHistory limit={10} />
      </section>
    </>
  );
}

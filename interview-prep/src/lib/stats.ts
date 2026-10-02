import { CATEGORIES } from "./categories";
import type { AppData, CategoryId, PracticeAttempt, Question, StoredFeedback } from "./types";
import { dayKey } from "./utils";

export interface Readiness {
  /** 0–100 */
  percent: number;
  total: number;
  answered: number;
  practiced: number;
  strong: number;
  needsWork: number;
}

/**
 * Readiness is intentionally transparent: each question can earn up to three points —
 * it has a saved answer, it has been practised, and it is rated strong.
 */
export function computeReadiness(questions: Question[]): Readiness {
  const total = questions.length;
  const answered = questions.filter((q) => q.answer.trim().length > 0).length;
  const practiced = questions.filter((q) => q.practiced).length;
  const strong = questions.filter((q) => q.rating === "strong").length;
  const needsWork = questions.filter((q) => q.rating === "needs-work").length;
  const percent = total === 0 ? 0 : Math.round(((answered + practiced + strong) / (total * 3)) * 100);
  return { percent, total, answered, practiced, strong, needsWork };
}

export interface StreakInfo {
  current: number;
  longest: number;
  practicedToday: boolean;
}

export function computeStreak(attempts: PracticeAttempt[], now = new Date()): StreakInfo {
  const days = new Set(attempts.filter((a) => !a.skipped).map((a) => dayKey(a.createdAt)));
  const today = dayKey(now);
  const practicedToday = days.has(today);

  let current = 0;
  const cursor = new Date(now);
  if (!practicedToday) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const sorted = [...days].sort();
  let longest = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const k of sorted) {
    const d = new Date(`${k}T12:00:00`);
    if (prev && Math.round((d.getTime() - prev.getTime()) / 86400000) === 1) run++;
    else run = 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  return { current, longest: Math.max(longest, current), practicedToday };
}

export interface CategoryStat {
  id: CategoryId;
  label: string;
  short: string;
  total: number;
  answered: number;
  practiced: number;
  strong: number;
  needsWork: number;
  attempts: number;
  skipped: number;
  readiness: number;
}

export function computeCategoryStats(data: Pick<AppData, "questions" | "attempts">): CategoryStat[] {
  return CATEGORIES.map((c) => {
    const qs = data.questions.filter((q) => q.category === c.id);
    const r = computeReadiness(qs);
    const catAttempts = data.attempts.filter((a) => a.category === c.id);
    return {
      id: c.id,
      label: c.label,
      short: c.short,
      total: r.total,
      answered: r.answered,
      practiced: r.practiced,
      strong: r.strong,
      needsWork: r.needsWork,
      attempts: catAttempts.filter((a) => !a.skipped).length,
      skipped: catAttempts.filter((a) => a.skipped).length,
      readiness: r.percent,
    };
  });
}

export interface Recommendation {
  question: Question;
  reason: string;
  score: number;
}

/** "What should I practise next?" — ranks questions by how much preparation they still need. */
export function recommendQuestions(questions: Question[], limit = 5, now = new Date()): Recommendation[] {
  const weekAgo = now.getTime() - 7 * 86400000;
  return questions
    .map((q) => {
      let score = 0;
      let reason = "";
      if (q.rating === "needs-work") {
        score += 4;
        reason = "Marked as needing improvement";
      }
      if (!q.practiced) {
        score += 3;
        reason ||= q.answer.trim() ? "Answer saved but never practised" : "Not practised yet";
      }
      if (!q.answer.trim()) {
        score += 1;
        reason ||= "No saved answer yet";
      }
      if (q.practiced && q.lastPracticedAt && new Date(q.lastPracticedAt).getTime() < weekAgo && q.rating !== "strong") {
        score += 1.5;
        reason ||= "Not practised in over a week";
      }
      if (["about-yourself", "motivation", "company-role"].includes(q.category) && q.rating !== "strong") score += 0.5;
      return { question: q, reason: reason || "Keep it fresh", score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.question.text.localeCompare(b.question.text))
    .slice(0, limit);
}

export interface FocusArea {
  categoryId: CategoryId;
  label: string;
  reason: string;
}

export function focusAreas(stats: CategoryStat[], limit = 3): FocusArea[] {
  return stats
    .filter((s) => s.total > 0)
    .map((s) => {
      let reason: string;
      if (s.practiced === 0) reason = `None of the ${s.total} questions practised yet`;
      else if (s.needsWork > 0) reason = `${s.needsWork} answer${s.needsWork === 1 ? "" : "s"} need improvement`;
      else if (s.answered < s.total) reason = `${s.total - s.answered} question${s.total - s.answered === 1 ? "" : "s"} without an answer`;
      else reason = "Practise more to build confidence";
      return { stat: s, reason };
    })
    .sort((a, b) => a.stat.readiness - b.stat.readiness || b.stat.needsWork - a.stat.needsWork)
    .slice(0, limit)
    .filter((x) => x.stat.readiness < 85)
    .map(({ stat, reason }) => ({ categoryId: stat.id, label: stat.label, reason }));
}

export interface DayActivity {
  key: string;
  date: Date;
  count: number;
}

export function activityByDay(attempts: PracticeAttempt[], days = 28, now = new Date()): DayActivity[] {
  const counts = new Map<string, number>();
  attempts.filter((a) => !a.skipped).forEach((a) => {
    const k = dayKey(a.createdAt);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  });
  const out: DayActivity[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const k = dayKey(d);
    out.push({ key: k, date: d, count: counts.get(k) ?? 0 });
  }
  return out;
}

export function attemptsInLastDays(attempts: PracticeAttempt[], days: number, now = new Date()): number {
  const since = now.getTime() - days * 86400000;
  return attempts.filter((a) => !a.skipped && new Date(a.createdAt).getTime() >= since).length;
}

export interface StarGap {
  element: "situation" | "task" | "action" | "result";
  label: string;
  weak: number;
  total: number;
}

/** Which STAR elements are most often partial/missing across all AI feedback received. */
export function starGaps(data: Pick<AppData, "questions" | "attempts">): StarGap[] {
  const feedbacks: StoredFeedback[] = [
    ...data.questions.map((q) => q.lastFeedback),
    ...data.attempts.map((a) => a.feedback),
  ].filter((f): f is StoredFeedback => !!f && f.isBehavioural);
  const labels = { situation: "Situation", task: "Task", action: "Action", result: "Result" } as const;
  return (Object.keys(labels) as StarGap["element"][]).map((el) => ({
    element: el,
    label: labels[el],
    weak: feedbacks.filter((f) => ["partial", "missing"].includes(f.starAnalysis[el].status)).length,
    total: feedbacks.length,
  }));
}

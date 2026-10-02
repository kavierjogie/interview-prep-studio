import type { AppData } from "./types";

function merge<T extends { id: string }>(before: T[], current: T[]): T[] {
  const have = new Set(current.map((x) => x.id));
  if (before.every((x) => have.has(x.id))) return current;
  const out = [...current];
  // Walking in the old order and splicing at the old index puts each item back where it was.
  before.forEach((x, i) => {
    if (!have.has(x.id)) out.splice(Math.min(i, out.length), 0, x);
  });
  return out;
}

/**
 * Undo for deletes: puts back every item that existed in `before` but is gone from `current`, and re-links
 * questions to restored stories and job preps. Unlike restoring the whole snapshot, edits made since are kept.
 */
export function restoreDeleted(before: AppData, current: AppData): AppData {
  const stories = merge(before.stories, current.stories);
  const jobPreps = merge(before.jobPreps, current.jobPreps);
  const storyIds = new Set(stories.map((s) => s.id));
  const prepIds = new Set(jobPreps.map((j) => j.id));
  const prevQuestions = new Map(before.questions.map((q) => [q.id, q]));

  const questions = merge(before.questions, current.questions).map((q) => {
    const prev = prevQuestions.get(q.id);
    if (!prev || prev === q) return q;
    const relinked = prev.storyIds.filter((id) => storyIds.has(id) && !q.storyIds.includes(id));
    const jobPrepId = q.jobPrepId ?? (prev.jobPrepId && prepIds.has(prev.jobPrepId) ? prev.jobPrepId : null);
    if (!relinked.length && jobPrepId === q.jobPrepId) return q;
    return { ...q, storyIds: [...q.storyIds, ...relinked], jobPrepId };
  });

  return {
    ...current,
    questions,
    stories,
    jobPreps,
    sessions: merge(before.sessions, current.sessions),
    attempts: merge(before.attempts, current.attempts),
  };
}

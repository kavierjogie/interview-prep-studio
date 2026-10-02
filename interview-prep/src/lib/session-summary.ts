import { CHECK_IMPROVE_LABEL, CHECK_STRENGTH_LABEL, runLocalChecks, type CheckId } from "./local-checks";
import { recommendQuestions } from "./stats";
import type { PracticeAttempt, Question, SessionSummary } from "./types";
import { normalizeText, uniqueStrings } from "./utils";

/**
 * Builds the "common strengths / improvement areas / practise next" summary for a session.
 * Uses AI feedback where the user requested it, and on-device quick checks otherwise.
 */
export function buildSessionSummary(attempts: PracticeAttempt[], questions: Question[]): SessionSummary & { usedAi: boolean } {
  const answered = attempts.filter((a) => !a.skipped && a.answer.trim());
  const withAi = answered.filter((a) => a.feedback);

  // Quick-check pass rates across answers.
  const tally = new Map<CheckId, { pass: number; total: number }>();
  const weakAttemptIds = new Set<string>();
  for (const a of answered) {
    const checks = runLocalChecks(a.answer, a.category);
    if (checks.filter((c) => !c.passed).length >= 2) weakAttemptIds.add(a.id);
    for (const c of checks) {
      const t = tally.get(c.id) ?? { pass: 0, total: 0 };
      t.total++;
      if (c.passed) t.pass++;
      tally.set(c.id, t);
    }
  }
  const localStrengths: string[] = [];
  const localImprovements: string[] = [];
  for (const [id, t] of tally) {
    if (t.total === 0) continue;
    if (t.pass / t.total >= 0.6) localStrengths.push(CHECK_STRENGTH_LABEL[id]);
    else localImprovements.push(CHECK_IMPROVE_LABEL[id]);
  }

  // AI feedback: take the headline point from each answer first, then fill.
  const aiStrengths = uniqueStrings([
    ...withAi.map((a) => a.feedback!.strengths[0] ?? ""),
    ...withAi.flatMap((a) => a.feedback!.strengths.slice(1)),
  ]);
  const aiImprovements = uniqueStrings([
    ...withAi.map((a) => a.feedback!.improvements[0] ?? ""),
    ...withAi.flatMap((a) => a.feedback!.improvements.slice(1)),
  ]);
  withAi.filter((a) => a.feedback!.verdict !== "strong").forEach((a) => weakAttemptIds.add(a.id));

  const skipped = attempts.filter((a) => a.skipped).length;
  const improvements = uniqueStrings([
    ...aiImprovements.slice(0, 4),
    ...localImprovements,
    skipped > 0 ? `Prepare answers for the ${skipped} question${skipped === 1 ? "" : "s"} you skipped` : "",
  ]).slice(0, 6);
  const strengths = uniqueStrings([...aiStrengths.slice(0, 4), ...localStrengths]).slice(0, 5);

  // Practise next: skipped/weak questions first, then general recommendations.
  const byText = new Map(questions.map((q) => [normalizeText(q.text), q.id]));
  const resolveId = (a: PracticeAttempt) =>
    (a.questionId && questions.some((q) => q.id === a.questionId) ? a.questionId : byText.get(normalizeText(a.questionText))) ?? null;
  const priority = attempts
    .filter((a) => a.skipped || weakAttemptIds.has(a.id))
    .map(resolveId)
    .filter((id): id is string => !!id);
  const recommendedQuestionIds = [
    ...new Set([...priority, ...recommendQuestions(questions, 6).map((r) => r.question.id)]),
  ].slice(0, 5);

  return { strengths, improvements, recommendedQuestionIds, usedAi: withAi.length > 0 };
}

import { getCategory } from "./categories";
import type { CategoryId } from "./types";
import { wordCount } from "./utils";

/**
 * Instant, offline checks on an answer. These are deliberately simple signals, not a grade:
 * they run on every submitted answer (no network) and power the mock-interview summary
 * when the user doesn't request AI analysis.
 */

export type CheckId = "length" | "ownership" | "result" | "context" | "reflection";

export interface LocalCheck {
  id: CheckId;
  label: string;
  passed: boolean;
  detail: string;
}

export const SPEAKING_WPM = 140;

export function estimateSpeakingSec(answer: string): number {
  return Math.round((wordCount(answer) / SPEAKING_WPM) * 60);
}

const RESULT_PATTERN =
  /\b(result(ed)?|outcome|as a result|which meant|so that|improv(ed|ing)|reduc(ed|ing)|increas(ed|ing)|sav(ed|ing)|deliver(ed)?|achiev(ed)?|won|placed|received|launched|completed|finished|submitted|grade|mark|feedback)\b|\d+\s?(%|percent|hours?|days?|weeks?|users?|people|students?)/i;
const CONTEXT_PATTERN = /\b(when|during|while|in my|at my|last year|in (19|20)\d\d|module|project|internship|role|team of|semester|placement)\b/i;
const REFLECTION_PATTERN = /\b(learn(ed|t)|taught me|next time|would (now|do)|differently|took away|realised|realized|since then)\b/i;

export function runLocalChecks(answer: string, category: CategoryId): LocalCheck[] {
  const words = wordCount(answer);
  const behavioural = getCategory(category).behavioural;
  const secs = estimateSpeakingSec(answer);
  const checks: LocalCheck[] = [];

  const tooShort = words < (behavioural ? 80 : 40);
  const tooLong = words > 380;
  checks.push({
    id: "length",
    label: "Answer length",
    passed: !tooShort && !tooLong,
    detail: tooShort
      ? `${words} words (about ${secs}s spoken). Add more detail so the interviewer can follow what happened.`
      : tooLong
        ? `${words} words (about ${Math.round(secs / 60)} min spoken). Aim for 1.5–2 minutes; trim background.`
        : `${words} words, about ${secs}s spoken. A comfortable length.`,
  });

  if (behavioural) {
    const iCount = (answer.match(/\bI\b|\bI'(m|ve|d)\b|\bmy\b/g) ?? []).length;
    const weCount = (answer.match(/\b(we|our|us)\b/gi) ?? []).length;
    checks.push({
      id: "ownership",
      label: "Your personal contribution",
      passed: iCount >= 3 && iCount >= weCount * 0.6,
      detail:
        iCount >= 3 && iCount >= weCount * 0.6
          ? "You describe what you did, not just what the team did."
          : "Use more 'I' statements so it's clear which actions were yours.",
    });
    checks.push({
      id: "context",
      label: "Situation is set",
      passed: CONTEXT_PATTERN.test(answer),
      detail: CONTEXT_PATTERN.test(answer)
        ? "The setting is clear."
        : "Open with one sentence on where and when this happened.",
    });
  }

  checks.push({
    id: "result",
    label: "Clear result",
    passed: RESULT_PATTERN.test(answer),
    detail: RESULT_PATTERN.test(answer)
      ? "You mention an outcome."
      : "Finish with a concrete outcome, ideally with a number or visible change.",
  });

  if (behavioural) {
    checks.push({
      id: "reflection",
      label: "Reflection",
      passed: REFLECTION_PATTERN.test(answer),
      detail: REFLECTION_PATTERN.test(answer)
        ? "You share what you learned."
        : "Optional: add what you learned or would do differently.",
    });
  }

  return checks;
}

export const CHECK_STRENGTH_LABEL: Record<CheckId, string> = {
  length: "Answers are a comfortable length",
  ownership: "Personal contribution comes through clearly",
  result: "Answers end with a clear outcome",
  context: "Situations are set up clearly",
  reflection: "Shares what was learned",
};

export const CHECK_IMPROVE_LABEL: Record<CheckId, string> = {
  length: "Answer length: some answers are too short or too long",
  ownership: "Use more 'I' statements to show your own actions",
  result: "State concrete results, ideally with numbers",
  context: "Set the scene in one opening sentence",
  reflection: "Close with what you learned",
};

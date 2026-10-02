import { isCategoryId, STORY_CONTEXTS } from "./categories";
import { DEFAULT_SETTINGS, SCHEMA_VERSION } from "./sample-data";
import type {
  AppData,
  ExportFile,
  JobAnalysis,
  JobPrep,
  PracticeAttempt,
  PracticeSession,
  Question,
  Settings,
  StoredFeedback,
  Story,
  StoryContext,
  SuggestedQuestion,
} from "./types";
import { normalizeFeedback } from "./feedback-schema";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max = 20000): string => (typeof v === "string" ? v.slice(0, max) : "");
const strOrNull = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const num = (v: unknown, fallback = 0): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const strArr = (v: unknown, maxItems = 50): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "").slice(0, maxItems).map((x) => x.slice(0, 200)) : [];
const iso = (v: unknown, fallback: string): string => {
  if (typeof v === "string" && !Number.isNaN(Date.parse(v))) return v;
  return fallback;
};

function sanitizeStoredFeedback(v: unknown): StoredFeedback | null {
  if (!isObj(v)) return null;
  const fb = normalizeFeedback(v);
  if (!fb) return null;
  return {
    ...fb,
    analyzedAt: iso(v.analyzedAt, new Date().toISOString()),
    answerSnapshot: str(v.answerSnapshot),
    model: str(v.model, 100) || "unknown",
  };
}

function sanitizeQuestion(v: unknown, now: string): Question | null {
  if (!isObj(v) || !str(v.id) || !str(v.text).trim()) return null;
  const rating = v.rating === "strong" || v.rating === "needs-work" ? v.rating : null;
  const source = v.source === "sample" || v.source === "job-prep" ? v.source : "user";
  return {
    id: str(v.id, 100),
    text: str(v.text, 1000).trim(),
    category: isCategoryId(v.category) ? v.category : "behavioural",
    answer: str(v.answer),
    notes: str(v.notes),
    tags: strArr(v.tags),
    storyIds: strArr(v.storyIds, 100),
    practiced: Boolean(v.practiced),
    rating,
    practiceCount: Math.max(0, Math.floor(num(v.practiceCount))),
    lastPracticedAt: strOrNull(v.lastPracticedAt),
    source,
    jobPrepId: strOrNull(v.jobPrepId),
    lastFeedback: sanitizeStoredFeedback(v.lastFeedback),
    createdAt: iso(v.createdAt, now),
    updatedAt: iso(v.updatedAt, now),
  };
}

function sanitizeStory(v: unknown, now: string): Story | null {
  if (!isObj(v) || !str(v.id) || !str(v.title).trim()) return null;
  const context = STORY_CONTEXTS.includes(v.context as StoryContext) ? (v.context as StoryContext) : "Other";
  return {
    id: str(v.id, 100),
    title: str(v.title, 200).trim(),
    description: str(v.description, 2000),
    context,
    situation: str(v.situation),
    task: str(v.task),
    action: str(v.action),
    result: str(v.result),
    skills: strArr(v.skills),
    tags: strArr(v.tags),
    createdAt: iso(v.createdAt, now),
    updatedAt: iso(v.updatedAt, now),
  };
}

function sanitizeAttempt(v: unknown, now: string): PracticeAttempt | null {
  if (!isObj(v) || !str(v.id) || !str(v.sessionId)) return null;
  return {
    id: str(v.id, 100),
    sessionId: str(v.sessionId, 100),
    questionId: strOrNull(v.questionId),
    questionText: str(v.questionText, 1000),
    category: isCategoryId(v.category) ? v.category : "behavioural",
    answer: str(v.answer),
    inputMethod: v.inputMethod === "voice" ? "voice" : "text",
    durationSec: Math.max(0, num(v.durationSec)),
    skipped: Boolean(v.skipped),
    selfRating: v.selfRating === "strong" || v.selfRating === "needs-work" ? v.selfRating : null,
    feedback: sanitizeStoredFeedback(v.feedback),
    createdAt: iso(v.createdAt, now),
  };
}

function sanitizeSession(v: unknown, now: string): PracticeSession | null {
  if (!isObj(v) || !str(v.id)) return null;
  const sourceTypes = ["random", "category", "specific", "job-prep", "mock"] as const;
  const sourceType = sourceTypes.includes(v.sourceType as (typeof sourceTypes)[number])
    ? (v.sourceType as PracticeSession["sourceType"])
    : "random";
  const planned = Array.isArray(v.plannedQuestions)
    ? v.plannedQuestions.filter(isObj).map((p) => ({
        questionId: strOrNull(p.questionId),
        text: str(p.text, 1000),
        category: isCategoryId(p.category) ? p.category : ("behavioural" as const),
      }))
    : [];
  const summary = isObj(v.summary)
    ? {
        strengths: strArr(v.summary.strengths),
        improvements: strArr(v.summary.improvements),
        recommendedQuestionIds: strArr(v.summary.recommendedQuestionIds),
      }
    : null;
  return {
    id: str(v.id, 100),
    mode: v.mode === "mock" ? "mock" : "practice",
    sourceType,
    label: str(v.label, 200) || "Practice session",
    templateId: strOrNull(v.templateId) ?? undefined,
    jobPrepId: strOrNull(v.jobPrepId) ?? undefined,
    plannedQuestions: planned,
    attemptIds: strArr(v.attemptIds, 500),
    startedAt: iso(v.startedAt, now),
    endedAt: strOrNull(v.endedAt),
    totalDurationSec: Math.max(0, num(v.totalDurationSec)),
    summary,
  };
}

export function sanitizeJobAnalysis(v: unknown): JobAnalysis | null {
  if (!isObj(v)) return null;
  const suggested: SuggestedQuestion[] = Array.isArray(v.suggestedQuestions)
    ? v.suggestedQuestions
        .filter(isObj)
        .map((q) => ({
          text: str(q.text, 500).trim(),
          category: isCategoryId(q.category) ? q.category : ("behavioural" as const),
          reason: str(q.reason, 500),
        }))
        .filter((q) => q.text)
        .slice(0, 30)
    : [];
  return {
    source: v.source === "ai" ? "ai" : "local",
    summary: str(v.summary, 2000),
    skills: strArr(v.skills, 40),
    technicalTopics: strArr(v.technicalTopics, 40),
    behaviouralAreas: strArr(v.behaviouralAreas, 40),
    prepTopics: strArr(v.prepTopics, 40),
    suggestedQuestions: suggested,
    analyzedAt: iso(v.analyzedAt, new Date().toISOString()),
  };
}

function sanitizeJobPrep(v: unknown, now: string): JobPrep | null {
  if (!isObj(v) || !str(v.id)) return null;
  return {
    id: str(v.id, 100),
    company: str(v.company, 200),
    role: str(v.role, 200),
    description: str(v.description, 30000),
    interviewDate: strOrNull(v.interviewDate),
    notes: str(v.notes),
    localAnalysis: sanitizeJobAnalysis(v.localAnalysis),
    aiAnalysis: sanitizeJobAnalysis(v.aiAnalysis),
    createdAt: iso(v.createdAt, now),
    updatedAt: iso(v.updatedAt, now),
  };
}

export function sanitizeSettings(v: unknown): Settings {
  if (!isObj(v)) return { ...DEFAULT_SETTINGS };
  const theme = v.theme === "light" || v.theme === "dark" ? v.theme : "system";
  return {
    displayName: str(v.displayName, 100),
    targetRole: str(v.targetRole, 200),
    answerTargetSec: Math.min(600, Math.max(30, Math.round(num(v.answerTargetSec, DEFAULT_SETTINGS.answerTargetSec)))),
    theme,
    weeklyGoal: Math.min(100, Math.max(1, Math.round(num(v.weeklyGoal, DEFAULT_SETTINGS.weeklyGoal)))),
  };
}

function sanitizeList<T>(v: unknown, fn: (x: unknown, now: string) => T | null, now: string): T[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of v) {
    const clean = fn(item, now) as (T & { id: string }) | null;
    if (clean && !seen.has(clean.id)) {
      seen.add(clean.id);
      out.push(clean);
    }
  }
  return out;
}

export function sanitizeAppData(v: Partial<Record<keyof AppData, unknown>>): AppData {
  const now = new Date().toISOString();
  const stories = sanitizeList(v.stories, sanitizeStory, now);
  const storyIds = new Set(stories.map((s) => s.id));
  const questions = sanitizeList(v.questions, sanitizeQuestion, now).map((q) => ({
    ...q,
    storyIds: q.storyIds.filter((id) => storyIds.has(id)),
  }));
  return {
    schemaVersion: SCHEMA_VERSION,
    questions,
    stories,
    attempts: sanitizeList(v.attempts, sanitizeAttempt, now),
    sessions: sanitizeList(v.sessions, sanitizeSession, now),
    jobPreps: sanitizeList(v.jobPreps, sanitizeJobPrep, now),
    settings: sanitizeSettings(v.settings),
  };
}

export type ImportResult =
  | { ok: true; data: AppData; counts: Record<"questions" | "stories" | "attempts" | "sessions" | "jobPreps", number> }
  | { ok: false; error: string };

export const MAX_IMPORT_BYTES = 15 * 1024 * 1024;

export function parseImportText(text: string): ImportResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "This file isn't valid JSON. Choose a file exported from Interview Prep Studio." };
  }
  if (!isObj(json)) return { ok: false, error: "The file doesn't contain preparation data." };
  if (json.app !== "interview-prep-studio") {
    return { ok: false, error: "This file wasn't exported from Interview Prep Studio, so it can't be imported." };
  }
  if (typeof json.schemaVersion === "number" && json.schemaVersion > SCHEMA_VERSION) {
    return { ok: false, error: "This file was created by a newer version of the app. Update the app and try again." };
  }
  const requiredArrays = ["questions", "stories", "attempts", "sessions", "jobPreps"] as const;
  for (const key of requiredArrays) {
    if (json[key] !== undefined && !Array.isArray(json[key])) {
      return { ok: false, error: `The "${key}" section of the file is malformed.` };
    }
  }
  const data = sanitizeAppData(json as Partial<Record<keyof AppData, unknown>>);
  return {
    ok: true,
    data,
    counts: {
      questions: data.questions.length,
      stories: data.stories.length,
      attempts: data.attempts.length,
      sessions: data.sessions.length,
      jobPreps: data.jobPreps.length,
    },
  };
}

export function buildExport(data: AppData): ExportFile {
  return { app: "interview-prep-studio", exportedAt: new Date().toISOString(), ...data, schemaVersion: SCHEMA_VERSION };
}

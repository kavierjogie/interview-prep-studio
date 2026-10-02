"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getDriver, THEME_KEY, type DriverName } from "./storage/drivers";
import { buildSampleData, emptyData, SAMPLE_PREFIX, SCHEMA_VERSION } from "./sample-data";
import { restoreDeleted as mergeDeleted } from "./restore";
import { sanitizeAppData } from "./validate";
import type {
  AppData,
  CategoryId,
  JobPrep,
  PracticeAttempt,
  PracticeSession,
  Question,
  Settings,
  StoredFeedback,
  Story,
} from "./types";
import { nowIso, uid } from "./utils";

type CollectionKey = "questions" | "stories" | "attempts" | "sessions" | "jobPreps" | "settings";
const COLLECTIONS: CollectionKey[] = ["questions", "stories", "attempts", "sessions", "jobPreps", "settings"];
const META_KEY = "meta";

export type QuestionInput = Pick<Question, "text" | "category"> &
  Partial<Pick<Question, "answer" | "notes" | "tags" | "storyIds" | "source" | "jobPrepId">>;

export type StoryInput = Omit<Story, "id" | "createdAt" | "updatedAt">;

export interface AttemptInput {
  questionId: string | null;
  questionText: string;
  category: CategoryId;
  answer: string;
  durationSec: number;
  skipped: boolean;
  selfRating?: Question["rating"];
  inputMethod?: PracticeAttempt["inputMethod"];
  originalTranscript?: string;
}

interface StoreValue {
  ready: boolean;
  driver: DriverName | null;
  storageError: string | null;
  data: AppData;

  addQuestion(input: QuestionInput): Question;
  addQuestions(inputs: QuestionInput[]): Question[];
  updateQuestion(id: string, patch: Partial<Omit<Question, "id" | "createdAt">>): void;
  deleteQuestion(id: string): void;

  addStory(input: StoryInput, questionIds?: string[]): Story;
  updateStory(id: string, patch: Partial<StoryInput>): void;
  deleteStory(id: string): void;
  setStoryQuestions(storyId: string, questionIds: string[]): void;

  startSession(input: Omit<PracticeSession, "id" | "attemptIds" | "startedAt" | "endedAt" | "totalDurationSec" | "summary">): PracticeSession;
  recordAttempt(sessionId: string, input: AttemptInput): PracticeAttempt;
  updateAttempt(id: string, patch: Partial<Pick<PracticeAttempt, "feedback" | "selfRating">>): void;
  finishSession(id: string, summary?: PracticeSession["summary"]): void;
  updateSession(id: string, patch: Partial<Pick<PracticeSession, "summary">>): void;
  deleteSession(id: string): void;

  addJobPrep(input: Pick<JobPrep, "company" | "role" | "description"> & Partial<JobPrep>): JobPrep;
  updateJobPrep(id: string, patch: Partial<Omit<JobPrep, "id" | "createdAt">>): void;
  deleteJobPrep(id: string): void;

  updateSettings(patch: Partial<Settings>): void;

  replaceAll(data: AppData): Promise<void>;
  resetAll(withSamples: boolean): Promise<void>;
  removeSampleData(): void;
  /** Undo for deletes: pass the `data` from before the delete. */
  restoreDeleted(before: AppData): void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within <StoreProvider>");
  return ctx;
}

function applyTheme(theme: Settings["theme"]) {
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore */
  }
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const next = dark ? "dark" : "light";
  const root = document.documentElement;
  if (root.dataset.theme === next) return;
  // Cross-fade instead of an abrupt brightness jump, where the browser supports view transitions.
  const apply = () => {
    root.dataset.theme = next;
  };
  if (document.startViewTransition) document.startViewTransition(apply);
  else apply();
}

function makeQuestion(input: QuestionInput): Question {
  const t = nowIso();
  return {
    id: uid("q"),
    text: input.text.trim(),
    category: input.category,
    answer: input.answer ?? "",
    notes: input.notes ?? "",
    tags: input.tags ?? [],
    storyIds: input.storyIds ?? [],
    practiced: false,
    rating: null,
    practiceCount: 0,
    lastPracticedAt: null,
    source: input.source ?? "user",
    jobPrepId: input.jobPrepId ?? null,
    lastFeedback: null,
    createdAt: t,
    updatedAt: t,
  };
}


/* ---- Write-ahead log in localStorage (only used when IndexedDB is the main store) ---- */
const PENDING_PREFIX = "ips-pending:";

function writePending(key: CollectionKey, value: unknown, seq: number): boolean {
  try {
    window.localStorage.setItem(PENDING_PREFIX + key, JSON.stringify({ seq, value }));
    return true;
  } catch {
    return false; // e.g. quota exceeded for a very large history; IndexedDB write still proceeds
  }
}

function readPending(key: CollectionKey): unknown {
  try {
    const raw = window.localStorage.getItem(PENDING_PREFIX + key);
    return raw ? (JSON.parse(raw) as { value: unknown }).value : undefined;
  } catch {
    return undefined;
  }
}

function clearPending(key: CollectionKey, seq?: number) {
  try {
    if (seq !== undefined) {
      const raw = window.localStorage.getItem(PENDING_PREFIX + key);
      if (raw && (JSON.parse(raw) as { seq: number }).seq !== seq) return; // a newer change is still pending
    }
    window.localStorage.removeItem(PENDING_PREFIX + key);
  } catch {
    /* ignore */
  }
}

async function writeAll(next: AppData, persisted: Partial<Record<CollectionKey, unknown>>) {
  const d = await getDriver();
  for (const key of COLLECTIONS) {
    await d.set(key, next[key]);
    persisted[key] = next[key];
    clearPending(key);
  }
  await d.set(META_KEY, { schemaVersion: SCHEMA_VERSION, initializedAt: nowIso() });
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(emptyData);
  const [ready, setReady] = useState(false);
  const [driver, setDriver] = useState<DriverName | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);

  /** Last persisted reference for each collection, so only changed collections are written. */
  const persisted = useRef<Partial<Record<CollectionKey, unknown>>>({});

  /* -------- Hydrate -------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await getDriver();
        const meta = await d.get<{ schemaVersion: number; initializedAt: string }>(META_KEY);
        let loaded: AppData;
        if (!meta) {
          loaded = buildSampleData();
          for (const key of COLLECTIONS) await d.set(key, loaded[key]);
          await d.set(META_KEY, { schemaVersion: SCHEMA_VERSION, initializedAt: nowIso() });
        } else {
          const raw: Partial<Record<CollectionKey, unknown>> = {};
          for (const key of COLLECTIONS) {
            // A pending write-ahead entry means the last change didn't reach IndexedDB before the page closed.
            const pending = d.name === "indexeddb" ? readPending(key) : undefined;
            if (pending !== undefined) {
              raw[key] = pending;
              await d.set(key, pending);
              clearPending(key);
            } else {
              raw[key] = await d.get(key);
            }
          }
          loaded = sanitizeAppData(raw);
        }
        if (cancelled) return;
        COLLECTIONS.forEach((k) => (persisted.current[k] = loaded[k]));
        setData(loaded);
        setDriver(d.name);
        if (d.name === "memory") {
          setStorageError("This browser is blocking storage, so changes will be lost when you close the tab. Export your data to keep it.");
        }
      } catch (err) {
        console.error("[store] Failed to load data", err);
        if (!cancelled) {
          setStorageError("Saved data couldn't be loaded. You can keep working, but export your data before closing the tab.");
          setData(buildSampleData());
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* -------- Persist changed collections --------
   * 1. Synchronously mirror the changed collection to localStorage (a small write-ahead log), in a layout
   *    effect so it lands before the triggering click/keypress handler returns. This survives an immediate reload.
   * 2. Write it to IndexedDB. Once that commits, clear the mirror (unless a newer change replaced it).
   * IndexedDB runs transactions on the same store in creation order, so the latest value always wins. */
  const writeSeq = useRef(0);
  useLayoutEffect(() => {
    if (!ready || !driver) return;
    for (const key of COLLECTIONS) {
      const value = data[key];
      if (persisted.current[key] === value) continue;
      persisted.current[key] = value;
      const seq = ++writeSeq.current;
      const mirrored = driver === "indexeddb" && writePending(key, value, seq);
      void getDriver()
        .then((d) => d.set(key, value))
        .then(() => {
          if (mirrored) clearPending(key, seq);
          setStorageError((prev) => (prev && prev.startsWith("Couldn't save") ? null : prev));
        })
        .catch((err) => {
          console.error(`[store] Failed to save ${key}`, err);
          persisted.current[key] = undefined; // retry on next change
          const quota = err instanceof DOMException && /quota/i.test(err.name + err.message);
          setStorageError(
            quota
              ? "Couldn't save: browser storage is full. Export your data, then delete old practice sessions."
              : "Couldn't save your latest changes to this browser. Export your data to keep a copy.",
          );
        });
    }
  }, [data, ready, driver]);

  /* -------- Theme -------- */
  useEffect(() => {
    if (!ready) return;
    applyTheme(data.settings.theme);
    if (data.settings.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [ready, data.settings.theme]);

  /* -------- Questions -------- */
  const addQuestion = useCallback((input: QuestionInput) => {
    const q = makeQuestion(input);
    setData((d) => ({ ...d, questions: [q, ...d.questions] }));
    return q;
  }, []);

  const addQuestions = useCallback((inputs: QuestionInput[]) => {
    const qs = inputs.map(makeQuestion);
    setData((d) => ({ ...d, questions: [...qs, ...d.questions] }));
    return qs;
  }, []);

  const updateQuestion = useCallback((id: string, patch: Partial<Omit<Question, "id" | "createdAt">>) => {
    setData((d) => ({
      ...d,
      questions: d.questions.map((q) => (q.id === id ? { ...q, ...patch, updatedAt: nowIso() } : q)),
    }));
  }, []);

  const deleteQuestion = useCallback((id: string) => {
    setData((d) => ({ ...d, questions: d.questions.filter((q) => q.id !== id) }));
  }, []);

  /* -------- Stories -------- */
  const addStory = useCallback((input: StoryInput, questionIds: string[] = []) => {
    const t = nowIso();
    const story: Story = { ...input, id: uid("s"), createdAt: t, updatedAt: t };
    const linked = new Set(questionIds);
    setData((d) => ({
      ...d,
      stories: [story, ...d.stories],
      questions: d.questions.map((q) => (linked.has(q.id) ? { ...q, storyIds: [...q.storyIds, story.id] } : q)),
    }));
    return story;
  }, []);

  const updateStory = useCallback((id: string, patch: Partial<StoryInput>) => {
    setData((d) => ({
      ...d,
      stories: d.stories.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: nowIso() } : s)),
    }));
  }, []);

  const deleteStory = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      stories: d.stories.filter((s) => s.id !== id),
      questions: d.questions.map((q) => (q.storyIds.includes(id) ? { ...q, storyIds: q.storyIds.filter((x) => x !== id) } : q)),
    }));
  }, []);

  const setStoryQuestions = useCallback((storyId: string, questionIds: string[]) => {
    const wanted = new Set(questionIds);
    setData((d) => ({
      ...d,
      questions: d.questions.map((q) => {
        const has = q.storyIds.includes(storyId);
        if (wanted.has(q.id) && !has) return { ...q, storyIds: [...q.storyIds, storyId] };
        if (!wanted.has(q.id) && has) return { ...q, storyIds: q.storyIds.filter((x) => x !== storyId) };
        return q;
      }),
    }));
  }, []);

  /* -------- Sessions & attempts -------- */
  const startSession: StoreValue["startSession"] = useCallback((input) => {
    const session: PracticeSession = {
      ...input,
      id: uid("sess"),
      attemptIds: [],
      startedAt: nowIso(),
      endedAt: null,
      totalDurationSec: 0,
      summary: null,
    };
    setData((d) => ({ ...d, sessions: [session, ...d.sessions] }));
    return session;
  }, []);

  const recordAttempt = useCallback((sessionId: string, input: AttemptInput) => {
    const t = nowIso();
    const attempt: PracticeAttempt = {
      id: uid("att"),
      sessionId,
      questionId: input.questionId,
      questionText: input.questionText,
      category: input.category,
      answer: input.answer,
      inputMethod: input.inputMethod ?? "text",
      ...(input.originalTranscript ? { originalTranscript: input.originalTranscript } : {}),
      durationSec: Math.round(input.durationSec),
      skipped: input.skipped,
      selfRating: input.selfRating ?? null,
      feedback: null,
      createdAt: t,
    };
    setData((d) => ({
      ...d,
      attempts: [attempt, ...d.attempts],
      sessions: d.sessions.map((s) =>
        s.id === sessionId
          ? { ...s, attemptIds: [...s.attemptIds, attempt.id], totalDurationSec: s.totalDurationSec + attempt.durationSec }
          : s,
      ),
      questions:
        input.skipped || !input.questionId
          ? d.questions
          : d.questions.map((q) =>
              q.id === input.questionId
                ? {
                    ...q,
                    practiced: true,
                    practiceCount: q.practiceCount + 1,
                    lastPracticedAt: t,
                    rating: input.selfRating ?? q.rating,
                    updatedAt: t,
                  }
                : q,
            ),
    }));
    return attempt;
  }, []);

  const updateAttempt = useCallback((id: string, patch: Partial<Pick<PracticeAttempt, "feedback" | "selfRating">>) => {
    setData((d) => {
      const attempt = d.attempts.find((a) => a.id === id);
      return {
        ...d,
        attempts: d.attempts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        questions:
          patch.selfRating !== undefined && attempt?.questionId
            ? d.questions.map((q) => (q.id === attempt.questionId ? { ...q, rating: patch.selfRating ?? q.rating } : q))
            : d.questions,
      };
    });
  }, []);

  const finishSession = useCallback((id: string, summary?: PracticeSession["summary"]) => {
    setData((d) => ({
      ...d,
      sessions: d.sessions.map((s) => (s.id === id ? { ...s, endedAt: nowIso(), summary: summary ?? s.summary } : s)),
    }));
  }, []);

  const updateSession = useCallback((id: string, patch: Partial<Pick<PracticeSession, "summary">>) => {
    setData((d) => ({ ...d, sessions: d.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  }, []);

  const deleteSession = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      sessions: d.sessions.filter((s) => s.id !== id),
      attempts: d.attempts.filter((a) => a.sessionId !== id),
    }));
  }, []);

  /* -------- Job preps -------- */
  const addJobPrep: StoreValue["addJobPrep"] = useCallback((input) => {
    const t = nowIso();
    const prep: JobPrep = {
      id: uid("job"),
      company: input.company.trim(),
      role: input.role.trim(),
      description: input.description,
      interviewDate: input.interviewDate ?? null,
      notes: input.notes ?? "",
      localAnalysis: input.localAnalysis ?? null,
      aiAnalysis: input.aiAnalysis ?? null,
      createdAt: t,
      updatedAt: t,
    };
    setData((d) => ({ ...d, jobPreps: [prep, ...d.jobPreps] }));
    return prep;
  }, []);

  const updateJobPrep = useCallback((id: string, patch: Partial<Omit<JobPrep, "id" | "createdAt">>) => {
    setData((d) => ({
      ...d,
      jobPreps: d.jobPreps.map((j) => (j.id === id ? { ...j, ...patch, updatedAt: nowIso() } : j)),
    }));
  }, []);

  const deleteJobPrep = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      jobPreps: d.jobPreps.filter((j) => j.id !== id),
      questions: d.questions.map((q) => (q.jobPrepId === id ? { ...q, jobPrepId: null } : q)),
    }));
  }, []);

  /* -------- Settings & bulk -------- */
  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  }, []);

  const replaceAll = useCallback(async (next: AppData) => {
    await writeAll(next, persisted.current);
    setData(next);
  }, []);

  const resetAll = useCallback(async (withSamples: boolean) => {
    const d = await getDriver();
    await d.clear();
    const next = withSamples ? buildSampleData() : emptyData();
    await writeAll(next, persisted.current);
    setData(next);
  }, []);

  const removeSampleData = useCallback(() => {
    const isSample = (id: string) => id.startsWith(SAMPLE_PREFIX);
    setData((d) => {
      const sessions = d.sessions.filter((s) => !isSample(s.id));
      return {
        ...d,
        questions: d.questions
          .filter((q) => !isSample(q.id))
          .map((q) => ({ ...q, storyIds: q.storyIds.filter((id) => !isSample(id)) })),
        stories: d.stories.filter((s) => !isSample(s.id)),
        sessions,
        attempts: d.attempts.filter((a) => !isSample(a.id) && !isSample(a.sessionId)),
      };
    });
  }, []);

  const restoreDeleted = useCallback((before: AppData) => setData((d) => mergeDeleted(before, d)), []);

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      driver,
      storageError,
      data,
      addQuestion,
      addQuestions,
      updateQuestion,
      deleteQuestion,
      addStory,
      updateStory,
      deleteStory,
      setStoryQuestions,
      startSession,
      recordAttempt,
      updateAttempt,
      finishSession,
      updateSession,
      deleteSession,
      addJobPrep,
      updateJobPrep,
      deleteJobPrep,
      updateSettings,
      replaceAll,
      resetAll,
      removeSampleData,
      restoreDeleted,
    }),
    [
      ready, driver, storageError, data, addQuestion, addQuestions, updateQuestion, deleteQuestion, addStory, updateStory,
      deleteStory, setStoryQuestions, startSession, recordAttempt, updateAttempt, finishSession, updateSession, deleteSession,
      addJobPrep, updateJobPrep, deleteJobPrep, updateSettings, replaceAll, resetAll, removeSampleData, restoreDeleted,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

/** Convenience type re-export for components dealing with stored feedback. */
export type { StoredFeedback };

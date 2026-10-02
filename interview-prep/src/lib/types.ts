/**
 * Core domain types for Interview Prep Studio.
 * Everything here is stored in the browser (IndexedDB, with a localStorage fallback).
 */

export type CategoryId =
  | "about-yourself"
  | "teamwork"
  | "problem-solving"
  | "leadership"
  | "strengths-weaknesses"
  | "conflict"
  | "setbacks"
  | "motivation"
  | "technical"
  | "company-role"
  | "behavioural"
  | "closing";

export type AnswerRating = "strong" | "needs-work";

export type QuestionSource = "sample" | "user" | "job-prep";

export interface Question {
  id: string;
  text: string;
  category: CategoryId;
  answer: string;
  notes: string;
  tags: string[];
  /** STAR stories this question can be answered with. Single source of truth for question↔story links. */
  storyIds: string[];
  practiced: boolean;
  rating: AnswerRating | null;
  practiceCount: number;
  lastPracticedAt: string | null;
  source: QuestionSource;
  jobPrepId: string | null;
  /** Most recent AI feedback for the saved answer (not for practice attempts). */
  lastFeedback: StoredFeedback | null;
  createdAt: string;
  updatedAt: string;
}

export type StoryContext =
  | "University"
  | "Work"
  | "Project"
  | "Volunteering"
  | "Hackathon"
  | "Personal"
  | "Other";

export interface Story {
  id: string;
  title: string;
  description: string;
  context: StoryContext;
  situation: string;
  task: string;
  action: string;
  result: string;
  skills: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * How an answer was captured. Only "text" is implemented today.
 * "voice" is reserved so audio recording + transcription can be added later:
 * a voice attempt will store a transcript in `answer` and optional audio metadata in `media`.
 */
export type InputMethod = "text" | "voice";

export interface AttemptMedia {
  kind: "audio";
  /** Key of a blob stored in a separate IndexedDB store (future). */
  blobKey: string;
  durationSec: number;
  mimeType: string;
}

export interface PracticeAttempt {
  id: string;
  sessionId: string;
  /** null when the question came from a mock template and isn't in the bank. */
  questionId: string | null;
  questionText: string;
  category: CategoryId;
  answer: string;
  inputMethod: InputMethod;
  media?: AttemptMedia;
  durationSec: number;
  skipped: boolean;
  selfRating: AnswerRating | null;
  feedback: StoredFeedback | null;
  createdAt: string;
}

export type SessionMode = "practice" | "mock";

export type PracticeSourceType = "random" | "category" | "specific" | "job-prep" | "mock";

export interface SessionSummary {
  strengths: string[];
  improvements: string[];
  recommendedQuestionIds: string[];
}

export interface PracticeSession {
  id: string;
  mode: SessionMode;
  sourceType: PracticeSourceType;
  /** Human readable, e.g. "Teamwork", "Software Developer mock", "ABC Company – Graduate Developer" */
  label: string;
  templateId?: string;
  jobPrepId?: string;
  plannedQuestions: { questionId: string | null; text: string; category: CategoryId }[];
  attemptIds: string[];
  startedAt: string;
  endedAt: string | null;
  totalDurationSec: number;
  summary: SessionSummary | null;
}

/* ---------------- AI feedback ---------------- */

export type StarStatus = "clear" | "partial" | "missing" | "not-applicable";
export type DimensionLevel = "strong" | "okay" | "weak";
export type FeedbackVerdict = "strong" | "developing" | "needs-work";

export interface StarElement {
  status: StarStatus;
  comment: string;
}

export interface FeedbackDimension {
  key: "relevance" | "specificity" | "ownership" | "structure" | "conciseness" | "delivery";
  label: string;
  level: DimensionLevel;
  note: string;
}

export interface AIFeedback {
  overallFeedback: string;
  verdict: FeedbackVerdict;
  verdictExplanation: string;
  isBehavioural: boolean;
  strengths: string[];
  improvements: string[];
  starAnalysis: {
    situation: StarElement;
    task: StarElement;
    action: StarElement;
    result: StarElement;
  };
  dimensions: FeedbackDimension[];
  suggestedImprovements: string[];
  suggestedAnswer: string;
  followUpQuestions: string[];
}

export interface StoredFeedback extends AIFeedback {
  analyzedAt: string;
  /** The exact answer text that was analysed, so we can show if it's stale. */
  answerSnapshot: string;
  model: string;
}

export interface AnalyzeRequest {
  question: string;
  category: CategoryId;
  answer: string;
  /** Optional context for job-specific prep. Only company and role are sent, never the full local dataset. */
  role?: string;
  company?: string;
}

export interface AnalyzeResponse {
  feedback: AIFeedback;
  model: string;
}

export interface ApiErrorBody {
  error: string;
  code:
    | "missing_key"
    | "invalid_input"
    | "rate_limited"
    | "upstream_error"
    | "bad_ai_response"
    | "timeout"
    | "server_error";
}

/* ---------------- Job preparation ---------------- */

export interface SuggestedQuestion {
  text: string;
  category: CategoryId;
  reason: string;
}

export interface JobAnalysis {
  source: "ai" | "local";
  summary: string;
  skills: string[];
  technicalTopics: string[];
  behaviouralAreas: string[];
  prepTopics: string[];
  suggestedQuestions: SuggestedQuestion[];
  analyzedAt: string;
}

export interface JobPrep {
  id: string;
  company: string;
  role: string;
  description: string;
  interviewDate: string | null;
  notes: string;
  localAnalysis: JobAnalysis | null;
  aiAnalysis: JobAnalysis | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobAnalysisRequest {
  company: string;
  role: string;
  description: string;
}

/* ---------------- Settings & whole store ---------------- */

export type ThemePreference = "system" | "light" | "dark";

export interface Settings {
  displayName: string;
  targetRole: string;
  /** Target answer length for the practice timer, in seconds. */
  answerTargetSec: number;
  theme: ThemePreference;
  weeklyGoal: number;
}

export interface AppData {
  schemaVersion: number;
  questions: Question[];
  stories: Story[];
  attempts: PracticeAttempt[];
  sessions: PracticeSession[];
  jobPreps: JobPrep[];
  settings: Settings;
}

export interface ExportFile extends AppData {
  app: "interview-prep-studio";
  exportedAt: string;
}

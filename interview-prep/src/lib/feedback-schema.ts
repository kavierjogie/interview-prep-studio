import type {
  AIFeedback,
  DimensionLevel,
  FeedbackDimension,
  FeedbackVerdict,
  StarElement,
  StarStatus,
} from "./types";

/**
 * Turns a loosely-shaped object (from the model, or from an imported file) into a
 * predictable AIFeedback. Missing pieces get safe defaults; returns null only when
 * there's nothing meaningful to show.
 */

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown, max = 4000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const list = (v: unknown, maxItems = 8) =>
  Array.isArray(v)
    ? v
        .map((x) => (typeof x === "string" ? x : isObj(x) ? text(x.text ?? x.question ?? x.point) : ""))
        .map((x) => x.trim().slice(0, 600))
        .filter(Boolean)
        .slice(0, maxItems)
    : [];

const STAR_STATUSES: StarStatus[] = ["clear", "partial", "missing", "not-applicable"];
const LEVELS: DimensionLevel[] = ["strong", "okay", "weak"];
const VERDICTS: FeedbackVerdict[] = ["strong", "developing", "needs-work"];

export const DIMENSION_LABELS: Record<FeedbackDimension["key"], string> = {
  relevance: "Relevance",
  specificity: "Specificity",
  ownership: "Personal contribution",
  structure: "Structure",
  conciseness: "Conciseness",
  delivery: "Natural delivery",
};

function starElement(v: unknown, isBehavioural: boolean): StarElement {
  if (typeof v === "string") return { status: isBehavioural ? "partial" : "not-applicable", comment: text(v, 600) };
  if (!isObj(v)) return { status: isBehavioural ? "missing" : "not-applicable", comment: "" };
  const raw = text(v.status, 30).toLowerCase().replace(/[\s_]+/g, "-");
  const status = (STAR_STATUSES as string[]).includes(raw) ? (raw as StarStatus) : isBehavioural ? "partial" : "not-applicable";
  return { status, comment: text(v.comment ?? v.feedback, 600) };
}

function normalizeDimensions(v: unknown): FeedbackDimension[] {
  const keys = Object.keys(DIMENSION_LABELS) as FeedbackDimension["key"][];
  const byKey = new Map<string, Obj>();
  if (Array.isArray(v)) {
    v.filter(isObj).forEach((d) => byKey.set(text(d.key, 30).toLowerCase(), d));
  } else if (isObj(v)) {
    Object.entries(v).forEach(([k, d]) => isObj(d) && byKey.set(k.toLowerCase(), d));
  }
  return keys
    .filter((k) => byKey.has(k))
    .map((k) => {
      const d = byKey.get(k)!;
      const level = text(d.level, 10).toLowerCase();
      return {
        key: k,
        label: DIMENSION_LABELS[k],
        level: (LEVELS as string[]).includes(level) ? (level as DimensionLevel) : "okay",
        note: text(d.note ?? d.comment, 400),
      };
    });
}

export function normalizeFeedback(raw: unknown): AIFeedback | null {
  if (!isObj(raw)) return null;
  const overallFeedback = text(raw.overallFeedback ?? raw.overall);
  const strengths = list(raw.strengths);
  const improvements = list(raw.improvements);
  if (!overallFeedback && strengths.length === 0 && improvements.length === 0) return null;

  const isBehavioural = raw.isBehavioural === undefined ? true : Boolean(raw.isBehavioural);
  const star = isObj(raw.starAnalysis) ? raw.starAnalysis : {};
  const verdictRaw = text(raw.verdict, 20).toLowerCase().replace(/[\s_]+/g, "-");

  return {
    overallFeedback,
    verdict: (VERDICTS as string[]).includes(verdictRaw) ? (verdictRaw as FeedbackVerdict) : "developing",
    verdictExplanation: text(raw.verdictExplanation, 600),
    isBehavioural,
    strengths,
    improvements,
    starAnalysis: {
      situation: starElement(star.situation, isBehavioural),
      task: starElement(star.task, isBehavioural),
      action: starElement(star.action, isBehavioural),
      result: starElement(star.result, isBehavioural),
    },
    dimensions: normalizeDimensions(raw.dimensions),
    suggestedImprovements: list(raw.suggestedImprovements),
    suggestedAnswer: text(raw.suggestedAnswer, 5000),
    followUpQuestions: list(raw.followUpQuestions, 5),
  };
}

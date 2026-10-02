import type { CategoryId, StoryContext } from "./types";

export interface CategoryDef {
  id: CategoryId;
  label: string;
  short: string;
  description: string;
  /** Whether a STAR-structured answer is expected. */
  behavioural: boolean;
}

export const CATEGORIES: CategoryDef[] = [
  { id: "about-yourself", label: "Tell Me About Yourself", short: "About you", description: "Your introduction and professional summary.", behavioural: false },
  { id: "teamwork", label: "Teamwork", short: "Teamwork", description: "Working with others towards a shared goal.", behavioural: true },
  { id: "problem-solving", label: "Problem Solving", short: "Problem solving", description: "How you break down and resolve problems.", behavioural: true },
  { id: "leadership", label: "Leadership & Ownership", short: "Leadership", description: "Taking initiative and responsibility.", behavioural: true },
  { id: "strengths-weaknesses", label: "Strengths & Weaknesses", short: "Strengths", description: "Self-awareness and growth.", behavioural: false },
  { id: "conflict", label: "Conflict Management", short: "Conflict", description: "Handling disagreement constructively.", behavioural: true },
  { id: "setbacks", label: "Setbacks & Challenges", short: "Setbacks", description: "Resilience and learning from difficulty.", behavioural: true },
  { id: "motivation", label: "Career & Motivation", short: "Motivation", description: "Why this career, why now, where next.", behavioural: false },
  { id: "technical", label: "Technical", short: "Technical", description: "Role-specific technical knowledge.", behavioural: false },
  { id: "company-role", label: "Company & Role", short: "Company", description: "Why this company and this role.", behavioural: false },
  { id: "behavioural", label: "Behavioural", short: "Behavioural", description: "General competency-based questions.", behavioural: true },
  { id: "closing", label: "Closing Questions", short: "Closing", description: "Wrapping up and asking good questions.", behavioural: false },
];

const CATEGORY_MAP = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: CategoryId): CategoryDef {
  return CATEGORY_MAP.get(id) ?? CATEGORIES[CATEGORIES.length - 2];
}

export function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === "string" && CATEGORY_MAP.has(value as CategoryId);
}

export const STORY_TAGS = [
  "Teamwork",
  "Problem Solving",
  "Leadership",
  "Ownership",
  "Communication",
  "Adaptability",
  "Conflict",
  "Time Management",
  "Persistence",
  "Learning",
  "Initiative",
  "Attention to Detail",
];

export const STORY_CONTEXTS: StoryContext[] = [
  "University",
  "Work",
  "Project",
  "Volunteering",
  "Hackathon",
  "Personal",
  "Other",
];

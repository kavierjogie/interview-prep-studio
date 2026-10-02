import type { CategoryId } from "./types";

export interface MockTemplate {
  id: string;
  title: string;
  description: string;
  durationHint: string;
  questions: { text: string; category: CategoryId }[];
}

export const MOCK_TEMPLATES: MockTemplate[] = [
  {
    id: "graduate",
    title: "General Graduate Interview",
    description: "The classic first-round structure used by most graduate programmes.",
    durationHint: "About 15 minutes",
    questions: [
      { text: "Tell me about yourself.", category: "about-yourself" },
      { text: "Why are you interested in this role?", category: "company-role" },
      { text: "Tell me about a time you solved a difficult problem.", category: "problem-solving" },
      { text: "Tell me about a time you worked in a team.", category: "teamwork" },
      { text: "What is one weakness you are currently working on?", category: "strengths-weaknesses" },
      { text: "Do you have any questions for us?", category: "closing" },
    ],
  },
  {
    id: "software",
    title: "Software Developer",
    description: "Behavioural questions mixed with project and technical discussion.",
    durationHint: "About 20 minutes",
    questions: [
      { text: "Tell me about yourself.", category: "about-yourself" },
      { text: "Walk me through a project you're proud of.", category: "technical" },
      { text: "Tell me about a bug that was hard to track down. How did you find it?", category: "problem-solving" },
      { text: "How do you resolve a merge conflict in Git?", category: "technical" },
      { text: "Tell me about a time you disagreed with a teammate about a technical decision.", category: "conflict" },
      { text: "How do you keep your technical skills up to date?", category: "motivation" },
      { text: "Do you have any questions for us?", category: "closing" },
    ],
  },
  {
    id: "it",
    title: "IT / Technology",
    description: "Support, infrastructure and general technology roles.",
    durationHint: "About 15 minutes",
    questions: [
      { text: "Tell me about yourself.", category: "about-yourself" },
      { text: "Tell me about a time you explained something technical to a non-technical person.", category: "behavioural" },
      { text: "A user says their computer is 'slow'. How would you troubleshoot it?", category: "technical" },
      { text: "Describe a time you had to manage competing deadlines.", category: "behavioural" },
      { text: "How do you stay calm when systems are down and people are frustrated?", category: "behavioural" },
      { text: "Do you have any questions for us?", category: "closing" },
    ],
  },
  {
    id: "data",
    title: "Data / Analytics",
    description: "Analytical thinking, communicating insight and working with messy data.",
    durationHint: "About 15 minutes",
    questions: [
      { text: "Tell me about yourself.", category: "about-yourself" },
      { text: "Tell me about a time you used data to make a decision.", category: "problem-solving" },
      { text: "How would you find duplicate records in a SQL table?", category: "technical" },
      { text: "How would you handle missing or inconsistent data in a dataset?", category: "technical" },
      { text: "Tell me about a time you explained something technical to a non-technical person.", category: "behavioural" },
      { text: "Do you have any questions for us?", category: "closing" },
    ],
  },
  {
    id: "behavioural",
    title: "Behavioural",
    description: "Competency questions only. Ideal for practising STAR stories.",
    durationHint: "About 15 minutes",
    questions: [
      { text: "Tell me about a time you took ownership of something.", category: "leadership" },
      { text: "Tell me about a setback and how you handled it.", category: "setbacks" },
      { text: "Tell me about a time you disagreed with a teammate.", category: "conflict" },
      { text: "Tell me about a time you had to adapt to a change quickly.", category: "behavioural" },
      { text: "How do you handle constructive criticism?", category: "strengths-weaknesses" },
    ],
  },
];

export const CUSTOM_TEMPLATE_ID = "custom";

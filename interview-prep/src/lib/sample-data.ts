import type {
  AppData,
  CategoryId,
  PracticeAttempt,
  PracticeSession,
  Question,
  Settings,
  StoredFeedback,
  Story,
} from "./types";

export const SCHEMA_VERSION = 1;
export const SAMPLE_PREFIX = "sample_";

export const DEFAULT_SETTINGS: Settings = {
  displayName: "",
  targetRole: "",
  answerTargetSec: 120,
  theme: "system",
  weeklyGoal: 10,
};

export function emptyData(): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    questions: [],
    stories: [],
    attempts: [],
    sessions: [],
    jobPreps: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

function daysAgo(now: Date, days: number, hour = 18, minute = 30): string {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/* ---------------- Stories ---------------- */

function buildStories(created: string): Story[] {
  const base = { createdAt: created, updatedAt: created };
  return [
    {
      ...base,
      id: "sample_s_neural",
      title: "Neural network group project",
      description: "Final-year group project where our model was underperforming two weeks before the deadline.",
      context: "University",
      situation:
        "In a four-person machine learning module we had to build an image classifier. Two weeks before the deadline our model was stuck at 61% accuracy and the team had started blaming each other's parts of the pipeline.",
      task:
        "I was responsible for the training pipeline, but I also wanted to get the team unstuck so we could hit the 80% target in the brief.",
      action:
        "I suggested we stop guessing and set up a shared experiment log. I wrote a small script to run each change in isolation, found that our data augmentation was flipping labels on one class, and fixed it. I then split the remaining tuning work so each person owned one experiment and we met for 15 minutes each evening to compare results.",
      result:
        "Accuracy rose to 84%, we submitted two days early and received 78% for the project. The experiment log became the appendix of our report, and two teammates reused the approach in their own theses.",
      skills: ["Python", "Debugging", "Collaboration"],
      tags: ["Problem Solving", "Ownership", "Teamwork", "Communication"],
    },
    {
      ...base,
      id: "sample_s_website",
      title: "University group website",
      description: "Web development module where a teammate stopped contributing mid-project.",
      context: "University",
      situation:
        "Our team of five was building a booking website for a student society. Halfway through, one member stopped attending stand-ups and their login and payments features were still unfinished.",
      task:
        "As the person coordinating our GitHub board, I needed to protect the deadline without shutting the teammate out.",
      action:
        "I messaged them privately to ask what was going on rather than raising it in the group chat. They were overwhelmed by another module, so we agreed they would keep the login feature and I would pair with them for an hour, while another teammate took over payments. I updated the board so the new ownership was visible to everyone.",
      result:
        "We delivered every feature on time and the society still uses the site. The teammate thanked me afterwards, and our lecturer highlighted our commit history as an example of fair contribution.",
      skills: ["React", "Git", "Project coordination"],
      tags: ["Teamwork", "Conflict", "Communication", "Leadership"],
    },
    {
      ...base,
      id: "sample_s_ar",
      title: "AR game assignment",
      description: "Augmented reality assignment where my first approach failed on real devices.",
      context: "University",
      situation:
        "For a mobile computing assignment I built an augmented reality game in Unity. A week before the demo, it ran well in the editor but crashed on most phones in the lab.",
      task: "I had to get a stable build working on the lab's Android devices before the live demo.",
      action:
        "I profiled the build and found that high-resolution textures were exhausting memory. I compressed the assets, reduced the number of tracked images from eight to four, and tested on the oldest phone first each day so I caught regressions early.",
      result:
        "The game ran smoothly at the demo and I received a distinction. I learned to test on the weakest target device early instead of assuming the editor reflects reality.",
      skills: ["Unity", "C#", "Performance profiling"],
      tags: ["Problem Solving", "Persistence", "Adaptability"],
    },
    {
      ...base,
      id: "sample_s_lab",
      title: "Lab assistant responsibility",
      description: "Running weekly programming labs as a teaching assistant.",
      context: "Work",
      situation:
        "As a teaching assistant for a first-year programming course, I ran a weekly lab for about 40 students. Many students were falling behind on one assignment about recursion and lab queues were getting very long.",
      task: "I wanted every student to get help within the lab period, not just the first few in the queue.",
      action:
        "I noticed most questions were variations of the same three misunderstandings, so I started each lab with a ten-minute walkthrough of those issues and created a one-page checklist. I also grouped students with similar problems so I could help four or five at once.",
      result:
        "Average wait time dropped from around 25 minutes to under 10, and the course coordinator shared my checklist with the other lab assistants.",
      skills: ["Teaching", "Java", "Communication"],
      tags: ["Ownership", "Communication", "Initiative", "Time Management"],
    },
    {
      ...base,
      id: "sample_s_hackathon",
      title: "Hackathon project",
      description: "48-hour hackathon where our team pivoted the idea halfway through.",
      context: "Hackathon",
      situation:
        "At a 48-hour hackathon our team planned a budgeting app, but after speaking to mentors on day one we realised the problem we were solving wasn't one users really had.",
      task: "As the team's frontend lead, I had to help us pivot quickly and still ship a working demo.",
      action:
        "I proposed we keep our backend and reframe the product around small business invoicing, which the mentors had flagged as a real pain point. I rebuilt the main screens overnight, kept a strict list of must-have features, and cut anything that didn't support the five-minute demo.",
      result:
        "We placed second out of 22 teams. The judges specifically mentioned how clearly the demo showed the problem and solution.",
      skills: ["Next.js", "Rapid prototyping", "Presenting"],
      tags: ["Adaptability", "Leadership", "Teamwork", "Time Management"],
    },
    {
      ...base,
      id: "sample_s_internship",
      title: "Software development project",
      description: "Building an internal reporting tool with unclear requirements.",
      context: "Project",
      situation:
        "During a vacation work placement I was asked to build a dashboard that pulled data from three spreadsheets the operations team updated by hand. The requirements were vague and the stakeholders disagreed about what mattered most.",
      task: "I needed to deliver something useful within four weeks without building the wrong thing.",
      action:
        "I held two short sessions with the operations lead to rank the metrics, built a clickable prototype first, and shipped a first version after ten days so people could react to real data. I documented the data cleaning steps so someone else could maintain it.",
      result:
        "The team stopped compiling their weekly report manually, saving around three hours a week, and the tool was handed over to the internal IT team when I left.",
      skills: ["SQL", "TypeScript", "Stakeholder management"],
      tags: ["Communication", "Ownership", "Problem Solving"],
    },
  ];
}

/* ---------------- Questions ---------------- */

interface QSeed {
  key: string;
  text: string;
  category: CategoryId;
  answer?: string;
  notes?: string;
  tags?: string[];
  storyIds?: string[];
  rating?: "strong" | "needs-work" | null;
  practiceCount?: number;
  lastPracticedDaysAgo?: number;
}

const QUESTION_SEEDS: QSeed[] = [
  {
    key: "tmay",
    text: "Tell me about yourself.",
    category: "about-yourself",
    answer:
      "I'm a recent computer science graduate who enjoys building practical software that people actually use. During my degree I worked as a teaching assistant for first-year programming, which taught me to explain technical ideas clearly. I've built web applications in React and TypeScript, including a booking site that a student society still uses, and our team placed second at a 48-hour hackathon. I'm now looking for a graduate developer role where I can keep learning from experienced engineers while contributing to real products.",
    notes: "Keep it under 90 seconds. Present → past → future.",
    tags: ["opener"],
    rating: "strong",
    practiceCount: 4,
    lastPracticedDaysAgo: 1,
  },
  {
    key: "team",
    text: "Tell me about a time you worked in a team.",
    category: "teamwork",
    answer:
      "In my final year I worked in a four-person team building an image classifier. Two weeks before the deadline we were stuck at 61% accuracy and people were blaming each other's code. I was responsible for the training pipeline, so I suggested a shared experiment log and wrote a script to test each change separately. That showed our augmentation was flipping labels on one class. After fixing it I split the remaining tuning so everyone owned one experiment. We reached 84% accuracy and submitted two days early.",
    tags: ["collaboration"],
    storyIds: ["sample_s_neural", "sample_s_website"],
    rating: "strong",
    practiceCount: 3,
    lastPracticedDaysAgo: 2,
  },
  {
    key: "setback",
    text: "Tell me about a setback and how you handled it.",
    category: "setbacks",
    answer:
      "For an AR assignment my game worked in Unity but crashed on the lab phones a week before the demo. I profiled it, found the textures were using too much memory, and compressed them. It worked in the end and I got a good mark.",
    notes: "Result is vague — mention the distinction and what I changed about testing.",
    storyIds: ["sample_s_ar"],
    rating: "needs-work",
    practiceCount: 2,
    lastPracticedDaysAgo: 3,
  },
  {
    key: "problem",
    text: "Tell me about a time you solved a difficult problem.",
    category: "problem-solving",
    storyIds: ["sample_s_neural", "sample_s_ar"],
    practiceCount: 1,
    lastPracticedDaysAgo: 5,
    rating: "needs-work",
    answer:
      "I had a problem with a neural network that wasn't accurate enough, so I debugged it and found a bug in the data augmentation. After that it worked much better.",
  },
  {
    key: "ownership",
    text: "Tell me about a time you took ownership of something.",
    category: "leadership",
    storyIds: ["sample_s_lab", "sample_s_neural"],
    practiceCount: 1,
    lastPracticedDaysAgo: 6,
  },
  { key: "lead", text: "Describe a situation where you led a group without formal authority.", category: "leadership", storyIds: ["sample_s_hackathon"] },
  {
    key: "strength",
    text: "What is your biggest strength?",
    category: "strengths-weaknesses",
    answer:
      "I think my biggest strength is breaking down messy problems. When our team's model was stuck, I set up an experiment log so we could test one change at a time instead of guessing, which is how we found the bug. I use the same approach when debugging any code.",
    rating: "strong",
    practiceCount: 2,
    lastPracticedDaysAgo: 4,
  },
  {
    key: "weakness",
    text: "What is one weakness you are currently working on?",
    category: "strengths-weaknesses",
    notes: "Pick a real weakness + concrete steps. Avoid 'perfectionism'.",
    practiceCount: 1,
    lastPracticedDaysAgo: 8,
    rating: "needs-work",
    answer: "I sometimes take on too much myself instead of asking for help.",
  },
  { key: "criticism", text: "How do you handle constructive criticism?", category: "strengths-weaknesses" },
  { key: "pressure", text: "How do you cope under pressure?", category: "behavioural", storyIds: ["sample_s_hackathon", "sample_s_ar"], practiceCount: 1, lastPracticedDaysAgo: 2 },
  { key: "why-role", text: "Why are you interested in this role?", category: "company-role", tags: ["research"], practiceCount: 1, lastPracticedDaysAgo: 1 },
  { key: "why-company", text: "Why do you want to work for our company?", category: "company-role", tags: ["research"] },
  { key: "conflict", text: "Tell me about a time you disagreed with a teammate.", category: "conflict", storyIds: ["sample_s_website"] },
  { key: "difficult-person", text: "Describe a time you worked with someone who wasn't pulling their weight.", category: "conflict", storyIds: ["sample_s_website"] },
  { key: "fail", text: "Tell me about a time you failed.", category: "setbacks", storyIds: ["sample_s_ar"] },
  { key: "five-years", text: "Where do you see yourself in five years?", category: "motivation" },
  { key: "why-career", text: "Why did you choose this career path?", category: "motivation", practiceCount: 1, lastPracticedDaysAgo: 9, rating: "strong", answer: "I chose software development because I enjoy turning a vague problem into something people can use. That clicked for me when a booking website I helped build was adopted by a student society, and I could see real people using it every week." },
  { key: "adapt", text: "Tell me about a time you had to adapt to a change quickly.", category: "behavioural", storyIds: ["sample_s_hackathon"] },
  { key: "deadline", text: "Describe a time you had to manage competing deadlines.", category: "behavioural" },
  { key: "communicate", text: "Tell me about a time you explained something technical to a non-technical person.", category: "behavioural", storyIds: ["sample_s_lab", "sample_s_internship"] },
  { key: "stakeholder", text: "Tell me about a time requirements were unclear. What did you do?", category: "problem-solving", storyIds: ["sample_s_internship"] },
  { key: "oop", text: "Explain the difference between a class and an object.", category: "technical", tags: ["fundamentals"] },
  { key: "rest", text: "What happens when you type a URL into a browser and press enter?", category: "technical", tags: ["web"] },
  { key: "sql", text: "How would you find duplicate records in a SQL table?", category: "technical", tags: ["sql"] },
  { key: "git", text: "How do you resolve a merge conflict in Git?", category: "technical", tags: ["git"] },
  { key: "project", text: "Walk me through a project you're proud of.", category: "technical", storyIds: ["sample_s_internship", "sample_s_hackathon"] },
  { key: "learn", text: "How do you keep your technical skills up to date?", category: "motivation" },
  { key: "questions", text: "Do you have any questions for us?", category: "closing", notes: "Ask about team onboarding, what success looks like in 6 months, and how feedback works." },
  { key: "salary", text: "What are your salary expectations?", category: "closing" },
  { key: "anything-else", text: "Is there anything else you'd like us to know about you?", category: "closing" },
];

const SAMPLE_FEEDBACK = (answer: string, at: string): StoredFeedback => ({
  analyzedAt: at,
  answerSnapshot: answer,
  model: "sample",
  overallFeedback:
    "This is a clear, well-structured teamwork answer. You show a real problem, what you personally did about it, and a measurable outcome. The main opportunity is to say a little more about how you handled the tension in the team, since that's what makes it a teamwork story rather than a debugging story.",
  verdict: "strong",
  verdictExplanation:
    "Interview-ready: the structure is complete and the result is specific. The suggestions below would make it more memorable rather than fix a gap.",
  isBehavioural: true,
  strengths: [
    "You gave a specific example with a clear deadline and stakes",
    "Your personal actions are easy to identify (you wrote the script, you split the work)",
    "The result is measurable: 61% to 84%, submitted two days early",
  ],
  improvements: [
    "Explain how you handled teammates blaming each other — that's the teamwork signal",
    "Cut the technical detail about augmentation to one short phrase",
  ],
  starAnalysis: {
    situation: { status: "clear", comment: "Team size, task and deadline are all clear." },
    task: { status: "clear", comment: "Your responsibility for the training pipeline is stated." },
    action: { status: "clear", comment: "Strong 'I' statements describing what you did." },
    result: { status: "partial", comment: "Good numbers, but add what the team learned or how the relationships improved." },
  },
  dimensions: [
    { key: "relevance", label: "Relevance", level: "strong", note: "Directly answers the teamwork question." },
    { key: "specificity", label: "Specificity", level: "strong", note: "Concrete numbers and timeline." },
    { key: "ownership", label: "Personal contribution", level: "strong", note: "Clear about what you did." },
    { key: "structure", label: "STAR structure", level: "strong", note: "Follows Situation → Result in order." },
    { key: "conciseness", label: "Conciseness", level: "okay", note: "Around 90 words; fine, but trim the technical detail." },
    { key: "delivery", label: "Natural delivery", level: "okay", note: "Reads well; practise saying it aloud so it doesn't sound memorised." },
  ],
  suggestedImprovements: [
    "Add one sentence on how you calmed the blame: e.g. 'I suggested we focus on evidence instead of whose code was wrong.'",
    "End with what you'd repeat in future teams.",
  ],
  suggestedAnswer:
    "In my final year I was one of four people building an image classifier. Two weeks before the deadline we were stuck at 61% accuracy and the team had started blaming each other's code. I owned the training pipeline, so I suggested we stop guessing and keep a shared experiment log instead. I wrote a script to test each change on its own, which showed our data augmentation was mislabelling one class. Once that was fixed, I split the remaining tuning so each person owned one experiment, and we met for fifteen minutes each evening. We reached 84% accuracy and submitted two days early. What I took from it is that a team under pressure works better when the conversation is about evidence rather than about people.",
  followUpQuestions: [
    "How did your teammates react when you suggested the experiment log?",
    "What would you do differently if you ran that project again?",
    "How did you decide who owned which experiment?",
  ],
});

function buildQuestions(now: Date, created: string): Question[] {
  return QUESTION_SEEDS.map((s) => {
    const lastPracticedAt = s.lastPracticedDaysAgo != null ? daysAgo(now, s.lastPracticedDaysAgo) : null;
    const answer = s.answer ?? "";
    return {
      id: `sample_q_${s.key}`,
      text: s.text,
      category: s.category,
      answer,
      notes: s.notes ?? "",
      tags: s.tags ?? [],
      storyIds: s.storyIds ?? [],
      practiced: (s.practiceCount ?? 0) > 0,
      rating: s.rating ?? null,
      practiceCount: s.practiceCount ?? 0,
      lastPracticedAt,
      source: "sample",
      jobPrepId: null,
      lastFeedback: s.key === "team" ? SAMPLE_FEEDBACK(answer, daysAgo(now, 2, 19)) : null,
      createdAt: created,
      updatedAt: lastPracticedAt ?? created,
    } satisfies Question;
  });
}

/* ---------------- Practice history ---------------- */

function buildHistory(now: Date, questions: Question[]) {
  const qByKey = (key: string) => questions.find((q) => q.id === `sample_q_${key}`)!;
  const sessions: PracticeSession[] = [];
  const attempts: PracticeAttempt[] = [];

  const plan: { day: number; label: string; sourceType: PracticeSession["sourceType"]; mode: PracticeSession["mode"]; keys: string[]; templateId?: string }[] = [
    { day: 9, label: "Career & Motivation", sourceType: "category", mode: "practice", keys: ["why-career"] },
    { day: 8, label: "Random questions", sourceType: "random", mode: "practice", keys: ["weakness", "tmay"] },
    { day: 6, label: "Leadership & Ownership", sourceType: "category", mode: "practice", keys: ["ownership"] },
    { day: 5, label: "Problem Solving", sourceType: "category", mode: "practice", keys: ["problem", "tmay"] },
    { day: 4, label: "Strengths & Weaknesses", sourceType: "category", mode: "practice", keys: ["strength", "strength"] },
    { day: 3, label: "General Graduate Interview", sourceType: "mock", mode: "mock", templateId: "graduate", keys: ["tmay", "why-role", "setback", "team", "setback"] },
    { day: 2, label: "Random questions", sourceType: "random", mode: "practice", keys: ["team", "pressure", "team"] },
    { day: 1, label: "Specific questions", sourceType: "specific", mode: "practice", keys: ["tmay", "why-role"] },
  ];

  plan.forEach((p, i) => {
    const sessionId = `sample_sess_${i}`;
    const start = new Date(daysAgo(now, p.day, 19, 0));
    let t = start.getTime();
    const ids: string[] = [];
    let total = 0;
    p.keys.forEach((key, j) => {
      const q = qByKey(key);
      const duration = 70 + ((i * 37 + j * 23) % 80);
      t += duration * 1000 + 20000;
      total += duration;
      const id = `sample_att_${i}_${j}`;
      ids.push(id);
      attempts.push({
        id,
        sessionId,
        questionId: q.id,
        questionText: q.text,
        category: q.category,
        answer: q.answer || "Practised out loud using my notes.",
        inputMethod: "text",
        durationSec: duration,
        skipped: false,
        selfRating: q.rating,
        feedback: null,
        createdAt: new Date(t).toISOString(),
      });
    });
    sessions.push({
      id: sessionId,
      mode: p.mode,
      sourceType: p.sourceType,
      label: p.label,
      templateId: p.templateId,
      plannedQuestions: p.keys.map((k) => ({ questionId: qByKey(k).id, text: qByKey(k).text, category: qByKey(k).category })),
      attemptIds: ids,
      startedAt: start.toISOString(),
      endedAt: new Date(t).toISOString(),
      totalDurationSec: total,
      summary:
        p.mode === "mock"
          ? {
              strengths: ["Clear, confident introduction", "Good use of specific numbers in the teamwork answer"],
              improvements: ["Results in setback answers are vague", "Research the company before answering 'why this role'"],
              recommendedQuestionIds: [qByKey("setback").id, qByKey("why-company").id, qByKey("weakness").id],
            }
          : null,
    });
  });

  return { sessions, attempts };
}

export function buildSampleData(now = new Date()): AppData {
  const created = daysAgo(now, 12, 10);
  const stories = buildStories(created);
  const questions = buildQuestions(now, created);
  const { sessions, attempts } = buildHistory(now, questions);
  return {
    schemaVersion: SCHEMA_VERSION,
    questions,
    stories,
    attempts,
    sessions,
    jobPreps: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

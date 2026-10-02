import type { CategoryId, JobAnalysis, SuggestedQuestion } from "./types";
import { uniqueStrings } from "./utils";

/**
 * Instant keyword-based job description scan. Runs entirely in the browser.
 * The optional AI analysis (/api/job-analysis) goes deeper, but this always works.
 */

const TECH: { name: string; pattern: RegExp; question?: string }[] = [
  { name: "JavaScript", pattern: /\bjavascript\b|\bjs\b/i },
  { name: "TypeScript", pattern: /\btypescript\b/i },
  { name: "React", pattern: /\breact(\.js|js)?\b/i, question: "How do you manage state in a React application?" },
  { name: "Next.js", pattern: /\bnext\.?js\b/i },
  { name: "Angular", pattern: /\bangular\b/i },
  { name: "Vue", pattern: /\bvue(\.js)?\b/i },
  { name: "Node.js", pattern: /\bnode(\.js|js)?\b/i },
  { name: "HTML & CSS", pattern: /\bhtml5?\b|\bcss3?\b/i },
  { name: "Python", pattern: /\bpython\b/i },
  { name: "Java", pattern: /\bjava\b(?!script)/i },
  { name: "C#", pattern: /\bc#|\bc sharp\b/i },
  { name: ".NET", pattern: /\.net\b|\bdotnet\b|\basp\.net\b/i },
  { name: "C++", pattern: /\bc\+\+/i },
  { name: "Go", pattern: /\bgolang\b/i },
  { name: "PHP", pattern: /\bphp\b/i },
  { name: "SQL", pattern: /\bsql\b|\bt-sql\b/i, question: "How would you find duplicate records in a SQL table?" },
  { name: "PostgreSQL", pattern: /\bpostgres(ql)?\b/i },
  { name: "MySQL", pattern: /\bmysql\b/i },
  { name: "MongoDB / NoSQL", pattern: /\bmongo(db)?\b|\bnosql\b/i },
  { name: "REST APIs", pattern: /\brest(ful)?\b|\bapis?\b/i, question: "What makes a REST API well designed?" },
  { name: "GraphQL", pattern: /\bgraphql\b/i },
  { name: "Git", pattern: /\bgit(hub|lab)?\b|version control/i, question: "How do you resolve a merge conflict in Git?" },
  { name: "Cloud (AWS)", pattern: /\baws\b|amazon web services/i },
  { name: "Cloud (Azure)", pattern: /\bazure\b/i },
  { name: "Cloud (GCP)", pattern: /\bgcp\b|google cloud/i },
  { name: "Docker", pattern: /\bdocker\b|container/i },
  { name: "Kubernetes", pattern: /\bkubernetes\b|\bk8s\b/i },
  { name: "CI/CD", pattern: /\bci\/cd\b|continuous (integration|delivery|deployment)|devops/i },
  { name: "Testing", pattern: /\bunit test|\btesting\b|\btdd\b|\bqa\b|quality assurance/i, question: "How do you decide what to test in your code?" },
  { name: "Agile / Scrum", pattern: /\bagile\b|\bscrum\b|\bkanban\b|\bsprint/i, question: "What has your experience been working in an Agile team?" },
  { name: "Object-oriented programming", pattern: /object[- ]oriented|\boop\b/i, question: "Explain the four principles of object-oriented programming." },
  { name: "Data structures & algorithms", pattern: /data structures|algorithms?/i },
  { name: "Linux", pattern: /\blinux\b|\bunix\b|\bbash\b/i },
  { name: "Networking", pattern: /\bnetwork(ing|s)?\b|tcp\/ip|\bdns\b|\blan\b/i, question: "Explain what happens when you type a URL into a browser." },
  { name: "Cybersecurity", pattern: /cyber ?security|information security|\bsecurity\b/i },
  { name: "IT support & troubleshooting", pattern: /troubleshoot|help ?desk|service desk|technical support|\bitil\b/i, question: "Walk me through how you would troubleshoot a user's connectivity issue." },
  { name: "Microsoft 365 / Active Directory", pattern: /active directory|office 365|microsoft 365|\bintune\b/i },
  { name: "Machine learning", pattern: /machine learning|\bml\b|deep learning/i, question: "How would you explain overfitting and how to prevent it?" },
  { name: "AI / LLMs", pattern: /\bai\b|artificial intelligence|\bllms?\b|generative/i },
  { name: "Data analysis", pattern: /data analy(sis|tics)|analy[sz]e data|insights?/i, question: "Tell me about a time you used data to make a decision." },
  { name: "Excel", pattern: /\bexcel\b|spreadsheets?/i },
  { name: "Power BI / Tableau", pattern: /power ?bi|tableau|looker|dashboards?/i, question: "How do you decide which visualisation to use for a dataset?" },
  { name: "Statistics", pattern: /statistic(s|al)/i },
  { name: "Pandas / NumPy", pattern: /\bpandas\b|\bnumpy\b/i },
  { name: "ETL / data pipelines", pattern: /\betl\b|data pipelines?|data engineering|\bspark\b/i },
  { name: "Mobile development", pattern: /\bandroid\b|\bios\b|react native|flutter|kotlin|swift\b/i },
  { name: "System design", pattern: /system design|architecture|scalab/i },
];

const BEHAVIOURAL: { area: string; pattern: RegExp; category: CategoryId; question: string; tag: string }[] = [
  { area: "Teamwork & collaboration", pattern: /team ?work|collaborat|cross-functional|team player/i, category: "teamwork", question: "Tell me about a time you worked in a team to deliver something under pressure.", tag: "Teamwork" },
  { area: "Communication", pattern: /communicat|present(ation|ing)|written and verbal|articulate/i, category: "behavioural", question: "Tell me about a time you explained something complex to someone without your background.", tag: "Communication" },
  { area: "Problem solving", pattern: /problem[- ]solv|analytical|critical thinking|solutions?[- ]oriented/i, category: "problem-solving", question: "Tell me about a time you solved a problem without an obvious answer.", tag: "Problem Solving" },
  { area: "Leadership & ownership", pattern: /leadership|take ownership|initiative|self[- ]starter|accountab/i, category: "leadership", question: "Tell me about a time you took ownership of something that wasn't strictly your job.", tag: "Ownership" },
  { area: "Adaptability", pattern: /adapt|fast[- ]paced|changing|ambiguity|flexib/i, category: "behavioural", question: "Tell me about a time you had to adapt quickly when plans changed.", tag: "Adaptability" },
  { area: "Time management & prioritisation", pattern: /deadline|time management|prioriti|multi-?task|organi[sz]ed/i, category: "behavioural", question: "Describe a time you had to manage competing deadlines.", tag: "Time Management" },
  { area: "Client & stakeholder focus", pattern: /client|customer|stakeholder|business partner|user[- ]focus/i, category: "behavioural", question: "Tell me about a time you had to understand what a client or user really needed.", tag: "Communication" },
  { area: "Learning agility", pattern: /eager to learn|willing(ness)? to learn|curious|curiosity|growth mindset|continuous learning|learn quickly/i, category: "motivation", question: "Tell me about a time you had to learn something new quickly.", tag: "Learning" },
  { area: "Attention to detail", pattern: /attention to detail|detail[- ]oriented|accuracy|meticulous/i, category: "behavioural", question: "Tell me about a time your attention to detail made a difference.", tag: "Attention to Detail" },
  { area: "Working under pressure", pattern: /pressure|high[- ]stakes|demanding/i, category: "behavioural", question: "How do you cope under pressure? Give an example.", tag: "Persistence" },
  { area: "Innovation", pattern: /innovat|creative|creativity|new ideas/i, category: "problem-solving", question: "Tell me about an idea you had that improved how something was done.", tag: "Initiative" },
  { area: "Integrity & ethics", pattern: /integrity|ethic|trust(worthy)?|confidential/i, category: "behavioural", question: "Tell me about a time you had to do the right thing when it wasn't the easy option.", tag: "Ownership" },
];

export function analyzeJobLocally(company: string, role: string, description: string): JobAnalysis {
  const text = `${role}\n${description}`;
  const tech = TECH.filter((t) => t.pattern.test(text));
  const behaviours = BEHAVIOURAL.filter((b) => b.pattern.test(description));
  const companyName = company.trim() || "the company";
  const roleName = role.trim() || "this role";

  const level = /\bgraduate|\bintern(ship)?\b|\bjunior\b|entry[- ]level|trainee|learnership/i.test(text)
    ? "early-career"
    : /\bsenior\b|\blead\b|\bprincipal\b|\d\+? years/i.test(text)
      ? "experienced"
      : null;

  const suggested: SuggestedQuestion[] = [
    { text: `Why are you interested in the ${roleName} role?`, category: "company-role", reason: "Asked in almost every interview." },
    { text: `Why do you want to work at ${companyName}?`, category: "company-role", reason: "Shows you've researched the company." },
    { text: "Tell me about yourself.", category: "about-yourself", reason: `Tailor your introduction to ${roleName}.` },
    ...behaviours.slice(0, 6).map((b) => ({ text: b.question, category: b.category, reason: `The description emphasises ${b.area.toLowerCase()}.` })),
    ...tech
      .slice(0, 8)
      .map((t) => ({
        text: t.question ?? `Tell me about your experience with ${t.name}.`,
        category: "technical" as const,
        reason: `${t.name} is mentioned in the description.`,
      })),
    { text: `What questions do you have about the ${roleName} role?`, category: "closing", reason: "Prepare two or three thoughtful questions." },
  ];

  const prepTopics = uniqueStrings([
    `Research ${companyName}: what it does, its clients, values and recent news`,
    `Prepare a 60-second introduction aimed at ${roleName}`,
    ...tech.slice(0, 5).map((t) => `Revise ${t.name} fundamentals and have one project example ready`),
    ...behaviours.slice(0, 4).map((b) => `Have a STAR story ready that shows ${b.area.toLowerCase()}`),
    level === "early-career" ? "Prepare examples from university, projects, part-time work or volunteering" : "",
    "Prepare questions to ask about the team, onboarding and what success looks like",
  ]);

  const summaryParts = [
    `Found ${tech.length} technical skill${tech.length === 1 ? "" : "s"} and ${behaviours.length} behavioural area${behaviours.length === 1 ? "" : "s"} in the description.`,
  ];
  if (level === "early-career") summaryParts.push("It reads as an early-career role, so expect strong emphasis on motivation, potential and learning.");
  if (level === "experienced") summaryParts.push("It reads as an experienced role, so expect depth on past impact.");
  if (behaviours.length) summaryParts.push(`Strongest behavioural signals: ${behaviours.slice(0, 3).map((b) => b.area.toLowerCase()).join(", ")}.`);

  return {
    source: "local",
    summary: summaryParts.join(" "),
    skills: uniqueStrings([...tech.map((t) => t.name), ...behaviours.map((b) => b.tag)]),
    technicalTopics: tech.map((t) => t.name),
    behaviouralAreas: behaviours.map((b) => b.area),
    prepTopics,
    suggestedQuestions: suggested,
    analyzedAt: new Date().toISOString(),
  };
}

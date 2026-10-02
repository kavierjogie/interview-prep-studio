# Interview Prep Studio

A personal, reusable workspace for job interview preparation: graduate programmes, software developer, IT, data and general roles. It isn't tied to any company.

Store questions and answers, build reusable STAR stories, practise against the clock, run mock interviews, prepare for a specific job description, and get structured AI feedback powered by [Groq](https://groq.com).

**Your preparation data stays in your browser.** There's no account and no database. AI analysis sends only the answer you're currently analysing to Groq.

---

## Features

- **Dashboard**: interview readiness, practice streak, strong answers and ones needing work, the questions to practise next, weak categories, recent sessions and an upcoming-interview banner.
- **Question bank**: 12 categories with search and filters for status and category. You can add, edit and delete questions, save answers, add notes and tags, rate answers, mark them practised and link STAR stories. Each question has a detail page with an answer editor, AI feedback and practice history.
- **STAR stories**: a guided Situation → Task → Action → Result builder.
  - Each story has tags, skills, where it happened (university, work, project, hackathon and so on) and the questions it answers.
  - One story can be linked to many questions.
  - You can draft an answer straight from a linked story.
- **Practice mode**: practise random questions (optionally weighted towards what needs work), a category, hand-picked questions, or questions from a job preparation session.
  - Questions appear one at a time with a timer ring and answer target, and you can skip.
  - After each answer you get on-device quick checks, a self-rating and optional AI feedback.
  - Your history is kept.
- **AI feedback (Groq)**: returns structured JSON that's rendered as proper UI.
  - It covers the overall impression, strengths, improvements, a STAR breakdown and how the answer comes across (relevance, specificity, personal contribution, structure, conciseness, delivery).
  - It also gives concrete tips, a suggested rewrite built only from your own details (gaps marked like `[add the result]`), and likely follow-up questions.
  - Instead of a numeric score there's a plain-language label with an explanation of what it means.
- **Mock interviews**: General Graduate, Software Developer, IT / Technology, Data / Analytics, Behavioural, or a custom set.
  - Questions are asked one after another with no hints.
  - The summary shows questions completed, answers submitted, time spent, common strengths and improvement areas, and what to practise next.
  - You can add AI feedback to every answer in one go.
- **Job preparation**: paste a company, role and job description.
  - An instant on-device scan pulls out skills, technical topics, behavioural areas, prep topics and suggested questions.
  - Optional AI analysis goes deeper.
  - You can add suggested questions to your bank and practise them as a set.
- **Progress**: readiness breakdown, streak, weekly goal, a 4-week activity grid, per-category readiness, STAR elements you often miss, most-skipped categories and full session history.
- **Settings**: name, target role (used as AI context), answer time target, weekly goal, light/dark/system theme. You can also export and import data, remove the sample content, reset everything, and read the privacy explanation.
- **Sample content** on first launch: about 30 questions, 6 STAR stories and recent practice history, so nothing looks empty. Remove it any time in Settings.

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** with design tokens for light and dark themes
- **lucide-react** icons; fonts self-hosted via `@fontsource-variable` (Bricolage Grotesque + Public Sans)
- **Groq API** through server-side route handlers, using plain `fetch` with no SDK
- Browser storage: **IndexedDB**, falling back to localStorage

No database, auth provider or UI framework dependencies.

## Local development

Requires Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env.local      # then put your Groq key in .env.local
npm run dev                     # http://localhost:3000
```

Other scripts:

```bash
npm run build      # production build (includes type checking)
npm run start      # serve the production build
npm run lint       # ESLint
npm run typecheck  # TypeScript only
```

The app works fully without a Groq key; only the "Analyse" buttons need it. Without a key they explain how to set one up.

## Environment variables

| Name | Required | Description |
| --- | --- | --- |
| `GROQ_API_KEY` | For AI features | Your Groq API key. **Server-side only.** Never prefix it with `NEXT_PUBLIC_`, never commit it. |
| `GROQ_MODEL` | No | Override the model. Defaults to `llama-3.3-70b-versatile`. |
| `GROQ_BASE_URL` | No | Override the API base URL (for a proxy or local testing). Defaults to `https://api.groq.com/openai/v1`. |

`.env.example` is included; `.env*` files are git-ignored.

## Groq API setup

1. Sign in at <https://console.groq.com> and create an API key under **API Keys**.
2. Locally: put it in `.env.local` as `GROQ_API_KEY=...` and restart `npm run dev`.
3. On Vercel: add it as an environment variable (see below).

> Groq is the AI inference platform at groq.com. It's not xAI's Grok.

### How the integration works

```
Browser ──POST /api/analyze──▶ Next.js route handler (server) ──▶ Groq chat completions (JSON mode)
        ◀── validated, normalised JSON ◀──────────────────────────┘
```

- `src/lib/server/groq.ts` reads `GROQ_API_KEY` at request time and is only imported by route handlers. The key never reaches client code.
- `POST /api/analyze` takes `{ question, category, answer, role?, company? }`. The browser client whitelists exactly these fields, so nothing else from local storage is sent.
- `POST /api/job-analysis` takes `{ company, role, description }`.
- `GET /api/status` reports whether a key is configured (never the key itself).
- The routes do all of the following:
  - validate input lengths and types
  - reject cross-site requests
  - apply a best-effort per-IP rate limit
  - time out after 25s
  - retry once if the model returns invalid JSON
  - normalise the response into a predictable shape (`src/lib/feedback-schema.ts`)
  - return friendly error messages for a missing or invalid key, rate limits and timeouts
- Prompts put user text inside delimiters and tell the model to treat it as data. The suggested rewrite may only use details from the candidate's answer.

## Deploying to Vercel

1. Push this project to a GitHub repository.
2. In Vercel, choose **Add New → Project** and import the repository. The framework preset (Next.js) is detected automatically; no build settings need changing.
3. Under **Settings → Environment Variables**, add `GROQ_API_KEY` for Production (and Preview if you want).
4. Deploy. If you add or change the key later, redeploy so the functions pick it up.

The API routes run as Node.js serverless functions with `maxDuration = 30`.

## Browser storage

All preparation data (questions, answers, stories, practice and mock history, job preparations and settings) is stored in **this browser only**:

- **IndexedDB** (database `interview-prep-studio`) is the main store. Each collection is saved under its own key, so editing a question doesn't rewrite your whole history.
- A small **write-ahead copy in localStorage** is written synchronously on every change and cleared once IndexedDB confirms the write. A refresh straight after an edit therefore can't lose it.
- If IndexedDB is unavailable (some private-browsing modes), the app falls back to **localStorage**. If that's blocked too, it runs in memory and shows a warning to export your data.
- Data persists across refreshes and browser restarts. It is **not** synced between browsers or devices. Use export/import to move it.
- Clearing site data in your browser deletes it.

## Export and import

In **Settings → Your data**:

- **Export data** downloads `interview-prep-YYYY-MM-DD.json` containing everything.
- **Import data** loads a previously exported file.
  - The file is validated first: wrong app, newer version or malformed sections are rejected with a clear message.
  - Every record is sanitised.
  - You see the counts and confirm before your current data is replaced.
- **Remove sample content** deletes only the built-in examples.
- **Reset everything** deletes all data after confirmation, optionally starting again with the samples.

Export regularly. Since nothing is stored on a server, the export file is your backup.

## Privacy

- Preparation data stays in your browser.
- AI analysis needs the selected answer (with its question, and your target role or job if set) to be sent to Groq. It is not completely private, and the app says so where you press "Analyse".
- The full local dataset is never sent anywhere.
- API keys stay server-side.

## Project structure

```
src/
  app/                    routes (pages) and API route handlers
    api/analyze           AI answer feedback
    api/job-analysis      AI job description analysis
    api/status            is AI configured?
  components/
    ui/                   design-system primitives (Button, Card, Modal, Toast, …)
    layout/               app shell, sidebar, mobile navigation
    feedback/             AI feedback rendering + analyse action, quick checks
    questions/ stories/ practice/ mock/ prepare/ progress/ dashboard/ settings/
  lib/
    store.tsx             app state + persistence
    storage/drivers.ts    IndexedDB / localStorage / memory drivers
    server/               Groq client, prompts, HTTP helpers (server-only)
    types.ts              domain types
    validate.ts           import/export validation and sanitising
    stats.ts              readiness, streaks, recommendations
    local-checks.ts       on-device answer checks
    job-analysis-local.ts on-device job description scan
```

## Adding voice answers later

Answers are captured in one place, `src/components/practice/AnswerComposer.tsx`, and attempts already record `inputMethod` (`"text" | "voice"`) plus an optional `media` reference. To add voice:

1. Record audio with `MediaRecorder` and store the blob in a separate IndexedDB store.
2. Add a server route that transcribes it (for example with Groq's Whisper endpoint).
3. Feed the transcript into the composer's `onChange`.

The runner, quick checks, AI analysis and history all work on the resulting text, so nothing else needs rebuilding.

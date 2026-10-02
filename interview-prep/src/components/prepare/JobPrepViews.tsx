"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { AlertCircle, Briefcase, CalendarDays, Check, Play, Plus, ShieldCheck, Sparkles, Trash2, Zap } from "lucide-react";
import { AiRequestError, analyzeJobDescription } from "@/lib/ai-client";
import { getCategory } from "@/lib/categories";
import { analyzeJobLocally } from "@/lib/job-analysis-local";
import { useStore } from "@/lib/store";
import type { JobAnalysis, JobPrep } from "@/lib/types";
import { useAiStatus } from "@/lib/use-ai-status";
import { formatDate, normalizeText, relativeTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink, IconButton } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Segmented } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toast";

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const target = new Date(`${date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function InterviewCountdown({ date }: { date: string | null }) {
  const d = daysUntil(date);
  if (d === null) return null;
  if (d < 0) return <Badge>Interview was {formatDate(date)}</Badge>;
  if (d === 0) return <Badge tone="marigold">Interview today</Badge>;
  return <Badge tone={d <= 3 ? "marigold" : "sky"}>{d === 1 ? "Interview tomorrow" : `Interview in ${d} days`}</Badge>;
}

/* ---------------- List ---------------- */

export function JobPrepListView() {
  const { data } = useStore();
  const [creating, setCreating] = useState(false);
  const preps = [...data.jobPreps].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <>
      <PageHeader
        title="Job preparation"
        description="Paste a job description to see the skills it asks for, the behaviours you'll likely be assessed on and the questions to prepare."
        actions={
          <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
            New preparation
          </Button>
        }
      />
      {preps.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-8 w-8" />}
          title="Prepare for a specific opportunity"
          description="Works for any company or role: graduate programmes, developer, IT, data or general roles."
          action={
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
              Paste a job description
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {preps.map((p) => {
            const added = data.questions.filter((q) => q.jobPrepId === p.id).length;
            const analysis = p.aiAnalysis ?? p.localAnalysis;
            return (
              <Link key={p.id} href={`/prepare/${p.id}`} className="group flex flex-col rounded-2xl border border-line bg-surface p-5 hover:border-line-strong">
                <p className="text-sm text-muted">{p.company || "Company not set"}</p>
                <h3 className="mt-0.5 text-[17px] font-semibold leading-snug group-hover:underline">{p.role || "Role not set"}</h3>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <InterviewCountdown date={p.interviewDate} />
                  {p.aiAnalysis && <Badge tone="pine">AI analysed</Badge>}
                </div>
                {analysis && analysis.skills.length > 0 && (
                  <p className="mt-3 line-clamp-2 text-[13px] text-muted">{analysis.skills.slice(0, 6).join(", ")}</p>
                )}
                <p className="mt-auto pt-4 text-[13px] text-faint">
                  {added} question{added === 1 ? "" : "s"} in your bank, updated {relativeTime(p.updatedAt)}
                </p>
              </Link>
            );
          })}
        </div>
      )}
      <NewJobPrepModal open={creating} onClose={() => setCreating(false)} />
    </>
  );
}

function NewJobPrepModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} size="lg" title="New job preparation" description="Everything you paste here is stored in this browser.">
      {open && <JobPrepForm onDone={onClose} />}
    </Modal>
  );
}

function JobPrepForm({ onDone }: { onDone: () => void }) {
  const { addJobPrep } = useStore();
  const router = useRouter();
  const toast = useToast();
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!role.trim() && !company.trim()) return setError("Add at least the company or the role.");
    if (description.trim().length < 80) return setError("Paste the job description (at least a few sentences) so it can be analysed.");
    const prep = addJobPrep({
      company,
      role,
      description: description.trim(),
      interviewDate: date || null,
      localAnalysis: analyzeJobLocally(company, role, description),
    });
    toast.success("Preparation created");
    onDone();
    router.push(`/prepare/${prep.id}`);
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company" htmlFor="j-company">
          <Input id="j-company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. ABC Company" maxLength={120} autoFocus />
        </Field>
        <Field label="Role" htmlFor="j-role">
          <Input id="j-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Graduate Software Developer" maxLength={120} />
        </Field>
      </div>
      <Field label="Interview date" htmlFor="j-date" optional>
        <Input id="j-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="sm:w-56" />
      </Field>
      <Field label="Job description" htmlFor="j-desc" error={error} hint={`${description.trim().length.toLocaleString()} characters`}>
        <Textarea
          id="j-desc"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            setError(null);
          }}
          placeholder="Paste the full job description: responsibilities, requirements and anything about the team."
          className="min-h-56"
        />
      </Field>
      <div className="flex justify-end gap-2">
        <Button onClick={onDone}>Cancel</Button>
        <Button type="submit" variant="primary">
          Create and analyse
        </Button>
      </div>
    </form>
  );
}

/* ---------------- Detail ---------------- */

export function JobPrepDetailView() {
  const { id } = useParams<{ id: string }>();
  const { data } = useStore();
  const prep = data.jobPreps.find((j) => j.id === id);
  if (!prep) {
    return (
      <EmptyState
        title="Preparation not found"
        description="It may have been deleted, or the link is from another browser."
        action={<ButtonLink href="/prepare">Back to job preparation</ButtonLink>}
      />
    );
  }
  return <JobPrepDetail key={prep.id} prep={prep} />;
}

type Tab = "overview" | "questions" | "details";

function JobPrepDetail({ prep }: { prep: JobPrep }) {
  const { data, updateJobPrep, deleteJobPrep, addQuestions } = useStore();
  const router = useRouter();
  const toast = useToast();
  const aiStatus = useAiStatus();
  const [tab, setTab] = useState<Tab>("overview");
  const [source, setSource] = useState<"ai" | "local">(prep.aiAnalysis ? "ai" : "local");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const analysis: JobAnalysis | null = source === "ai" && prep.aiAnalysis ? prep.aiAnalysis : prep.localAnalysis;
  const bankQuestions = data.questions.filter((q) => q.jobPrepId === prep.id);

  const runAi = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const result = await analyzeJobDescription({ company: prep.company, role: prep.role, description: prep.description });
      updateJobPrep(prep.id, { aiAnalysis: result });
      setSource("ai");
      toast.success("AI analysis ready");
    } catch (err) {
      setAiError(err instanceof AiRequestError ? err.message : "Something went wrong. Try again.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        back={{ href: "/prepare", label: "Job preparation" }}
        title={prep.role || "Untitled role"}
        description={prep.company || undefined}
        actions={
          <>
            <IconButton label="Delete preparation" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" />
            </IconButton>
            {bankQuestions.length > 0 && (
              <ButtonLink href={`/practice?job=${prep.id}`} variant="primary" icon={<Play className="h-4 w-4" />}>
                Practise {bankQuestions.length} question{bankQuestions.length === 1 ? "" : "s"}
              </ButtonLink>
            )}
          </>
        }
      />
      <div className="-mt-3 mb-6 flex flex-wrap items-center gap-2">
        <InterviewCountdown date={prep.interviewDate} />
      </div>

      <Card className="mb-6">
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {prep.aiAnalysis ? (
              <Segmented
                label="Analysis source"
                size="sm"
                value={source}
                onChange={setSource}
                options={[
                  { value: "ai", label: "AI analysis", icon: <Sparkles className="h-3.5 w-3.5" /> },
                  { value: "local", label: "Quick scan", icon: <Zap className="h-3.5 w-3.5" /> },
                ]}
              />
            ) : (
              <p className="text-sm">
                <span className="font-medium">Quick scan</span>
                <span className="text-muted"> found keywords instantly on your device. AI analysis reads the description in context.</span>
              </p>
            )}
            <p className="mt-2 flex items-start gap-1.5 text-[13px] text-muted">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pine" />
              AI analysis sends the company, role and job description to Groq. Not your answers or stories.
            </p>
          </div>
          <Button
            variant={prep.aiAnalysis ? "secondary" : "primary"}
            icon={<Sparkles className="h-4 w-4" />}
            onClick={runAi}
            loading={aiLoading}
            className="shrink-0"
          >
            {aiLoading ? "Analysing…" : prep.aiAnalysis ? "Analyse again" : "Analyse with AI"}
          </Button>
        </CardBody>
        {aiStatus && !aiStatus.aiConfigured && !prep.aiAnalysis && (
          <p className="border-t border-line px-5 py-3 text-[13px] text-muted">
            AI isn&apos;t configured on this deployment (no GROQ_API_KEY). The quick scan below still works.
          </p>
        )}
        {aiError && (
          <p role="alert" className="flex items-start gap-2 border-t border-line bg-rose-soft px-5 py-3 text-sm text-rose-text">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {aiError}
          </p>
        )}
      </Card>

      <Segmented
        label="Sections"
        className="mb-5"
        value={tab}
        onChange={setTab}
        options={[
          { value: "overview", label: "Overview" },
          { value: "questions", label: `Questions${analysis ? ` (${analysis.suggestedQuestions.length})` : ""}` },
          { value: "details", label: "Job details" },
        ]}
      />

      {tab === "overview" && (analysis ? <Overview analysis={analysis} /> : <p className="text-sm text-muted">No analysis yet. Save the job description to run a quick scan.</p>)}

      {tab === "questions" && analysis && (
        <SuggestedQuestions
          prep={prep}
          analysis={analysis}
          onAdd={(items) => {
            addQuestions(
              items.map((q) => ({
                text: q.text,
                category: q.category,
                source: "job-prep",
                jobPrepId: prep.id,
                tags: prep.company ? [prep.company] : [],
                notes: q.reason,
              })),
            );
            toast.success(`${items.length} question${items.length === 1 ? "" : "s"} added to your bank`);
          }}
        />
      )}

      {tab === "details" && (
        <JobDetailsForm
          prep={prep}
          onSave={(patch) => {
            const changedDescription =
              patch.description !== prep.description || patch.company !== prep.company || patch.role !== prep.role;
            updateJobPrep(prep.id, {
              ...patch,
              ...(changedDescription ? { localAnalysis: analyzeJobLocally(patch.company, patch.role, patch.description) } : {}),
            });
            toast.success(changedDescription ? "Saved and re-scanned" : "Saved");
          }}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        title="Delete this preparation?"
        message="The job description and analysis will be removed. Questions you added to your bank are kept."
        confirmLabel="Delete preparation"
        onConfirm={() => {
          deleteJobPrep(prep.id);
          toast.success("Preparation deleted");
          router.push("/prepare");
        }}
      />
    </>
  );
}

function ChipList({ items, tone = "neutral" }: { items: string[]; tone?: "neutral" | "pine" | "sky" }) {
  if (items.length === 0) return <p className="text-sm text-faint">None identified.</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((s) => (
        <Badge key={s} tone={tone}>
          {s}
        </Badge>
      ))}
    </div>
  );
}

function Overview({ analysis }: { analysis: JobAnalysis }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardBody>
          <p className="max-w-3xl text-[15.5px] leading-relaxed">{analysis.summary}</p>
          <p className="mt-2 text-xs text-faint">
            {analysis.source === "ai" ? "AI analysis" : "Quick scan"} from {relativeTime(analysis.analyzedAt).toLowerCase()}
          </p>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Skills mentioned" />
        <CardBody>
          <ChipList items={analysis.skills} tone="pine" />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Technical topics" />
        <CardBody>
          <ChipList items={analysis.technicalTopics} tone="sky" />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Likely behavioural areas" />
        <CardBody>
          <ChipList items={analysis.behaviouralAreas} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Topics to prepare" />
        <CardBody>
          <ul className="space-y-2">
            {analysis.prepTopics.map((t) => (
              <li key={t} className="flex gap-2.5 text-[14.5px]">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-pine" />
                {t}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}

function SuggestedQuestions({
  prep,
  analysis,
  onAdd,
}: {
  prep: JobPrep;
  analysis: JobAnalysis;
  onAdd: (items: JobAnalysis["suggestedQuestions"]) => void;
}) {
  const { data } = useStore();
  const inBank = useMemo(() => new Map(data.questions.map((q) => [normalizeText(q.text), q.id])), [data.questions]);
  const available = analysis.suggestedQuestions.filter((q) => !inBank.has(normalizeText(q.text)));
  const [selected, setSelected] = useState<Set<string>>(() => new Set(available.map((q) => q.text)));
  const chosen = available.filter((q) => selected.has(q.text));

  return (
    <Card>
      <CardHeader
        title="Suggested questions"
        description={`${analysis.suggestedQuestions.length - available.length} already in your bank`}
        action={
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="h-3.5 w-3.5" />}
            disabled={chosen.length === 0}
            onClick={() => {
              onAdd(chosen);
              setSelected(new Set());
            }}
          >
            Add {chosen.length || ""} to bank
          </Button>
        }
      />
      <CardBody>
        <ul className="divide-y divide-line">
          {analysis.suggestedQuestions.map((q) => {
            const existingId = inBank.get(normalizeText(q.text));
            return (
              <li key={q.text} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                {existingId ? (
                  <Check className="mt-1 h-4 w-4 shrink-0 text-pine" aria-label="Already in your bank" />
                ) : (
                  <input
                    type="checkbox"
                    aria-label={`Select: ${q.text}`}
                    checked={selected.has(q.text)}
                    onChange={() =>
                      setSelected((s) => {
                        const n = new Set(s);
                        if (n.has(q.text)) n.delete(q.text);
                        else n.add(q.text);
                        return n;
                      })
                    }
                    className="mt-1 h-4 w-4 accent-[var(--pine)]"
                  />
                )}
                <div className="min-w-0 flex-1">
                  {existingId ? (
                    <Link href={`/questions/${existingId}`} className="text-[15px] hover:underline">
                      {q.text}
                    </Link>
                  ) : (
                    <p className="text-[15px]">{q.text}</p>
                  )}
                  <p className="mt-0.5 text-[13px] text-muted">
                    {getCategory(q.category).label}. {q.reason}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
        {prep && data.questions.some((q) => q.jobPrepId === prep.id) && (
          <p className="mt-4 border-t border-line pt-4 text-sm text-muted">
            Questions you add are tagged with this preparation, so you can{" "}
            <Link href={`/practice?job=${prep.id}`} className="font-medium text-pine-text hover:underline">
              practise them together
            </Link>
            .
          </p>
        )}
      </CardBody>
    </Card>
  );
}

function JobDetailsForm({
  prep,
  onSave,
}: {
  prep: JobPrep;
  onSave: (patch: Pick<JobPrep, "company" | "role" | "description" | "interviewDate" | "notes">) => void;
}) {
  const [form, setForm] = useState({
    company: prep.company,
    role: prep.role,
    description: prep.description,
    interviewDate: prep.interviewDate ?? "",
    notes: prep.notes,
  });
  const [error, setError] = useState<string | null>(null);
  const dirty =
    form.company !== prep.company ||
    form.role !== prep.role ||
    form.description !== prep.description ||
    (form.interviewDate || null) !== prep.interviewDate ||
    form.notes !== prep.notes;

  return (
    <Card>
      <CardBody>
        <form
          className="space-y-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (form.description.trim().length < 80) return setError("Keep at least a few sentences of the job description.");
            onSave({ ...form, company: form.company.trim(), role: form.role.trim(), interviewDate: form.interviewDate || null });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Company" htmlFor="jd-company">
              <Input id="jd-company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} maxLength={120} />
            </Field>
            <Field label="Role" htmlFor="jd-role">
              <Input id="jd-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} maxLength={120} />
            </Field>
            <Field label={<span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Interview date</span>} htmlFor="jd-date" optional>
              <Input id="jd-date" type="date" value={form.interviewDate} onChange={(e) => setForm({ ...form, interviewDate: e.target.value })} />
            </Field>
          </div>
          <Field label="Job description" htmlFor="jd-desc" error={error}>
            <Textarea id="jd-desc" value={form.description} onChange={(e) => { setForm({ ...form, description: e.target.value }); setError(null); }} className="min-h-64" />
          </Field>
          <Field label="Your notes" htmlFor="jd-notes" optional hint="Research, interviewer names, questions you want to ask.">
            <Textarea id="jd-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={!dirty}>
              Save changes
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

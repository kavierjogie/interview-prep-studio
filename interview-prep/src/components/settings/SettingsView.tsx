"use client";

import { useRef, useState } from "react";
import { Database, Download, Lock, Server, ShieldCheck, Sparkles, Trash2, Upload } from "lucide-react";
import { SAMPLE_PREFIX } from "@/lib/sample-data";
import { useStore } from "@/lib/store";
import type { AppData, ThemePreference } from "@/lib/types";
import { useAiStatus } from "@/lib/use-ai-status";
import { formatDuration } from "@/lib/utils";
import { buildExport, MAX_IMPORT_BYTES, parseImportText } from "@/lib/validate";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field, Input, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Segmented } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toast";

const DRIVER_LABEL = { indexeddb: "IndexedDB (this browser)", localstorage: "localStorage (this browser)", memory: "Temporary memory only" } as const;

export function SettingsView() {
  const { data, driver, updateSettings, replaceAll, resetAll, removeSampleData } = useStore();
  const toast = useToast();
  const ai = useAiStatus();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(data.settings.displayName);
  const [role, setRole] = useState(data.settings.targetRole);
  const [pendingImport, setPendingImport] = useState<{ data: AppData; counts: Record<string, number>; fileName: string } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmSamples, setConfirmSamples] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetWithSamples, setResetWithSamples] = useState(false);

  const hasSamples =
    data.questions.some((q) => q.id.startsWith(SAMPLE_PREFIX)) || data.stories.some((s) => s.id.startsWith(SAMPLE_PREFIX));

  const exportData = () => {
    try {
      const json = JSON.stringify(buildExport(data), null, 2);
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `interview-prep-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Export downloaded");
    } catch {
      toast.error("Export failed. Try again, or use a different browser.");
    }
  };

  const onFile = async (file: File | undefined) => {
    setImportError(null);
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) return setImportError("That file is too large to be an Interview Prep Studio export (15 MB max).");
    if (!/\.json$/i.test(file.name) && file.type !== "application/json") return setImportError("Choose a .json file exported from this app.");
    try {
      const result = parseImportText(await file.text());
      if (!result.ok) return setImportError(result.error);
      setPendingImport({ data: result.data, counts: result.counts, fileName: file.name });
    } catch {
      setImportError("The file couldn't be read.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      <PageHeader title="Settings" description="Personalise practice, and manage the data stored in this browser." />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Profile" description="Used for your greeting and, if set, as role context for AI feedback." />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Field label="Your name" htmlFor="set-name" optional>
                <Input
                  id="set-name"
                  value={name}
                  maxLength={60}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => name !== data.settings.displayName && (updateSettings({ displayName: name.trim() }), toast.success("Name saved"))}
                />
              </Field>
              <Field label="Target role" htmlFor="set-role" optional hint="e.g. Graduate Software Developer">
                <Input
                  id="set-role"
                  value={role}
                  maxLength={120}
                  onChange={(e) => setRole(e.target.value)}
                  onBlur={() => role !== data.settings.targetRole && (updateSettings({ targetRole: role.trim() }), toast.success("Target role saved"))}
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Practice" />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Field label="Answer time target" htmlFor="set-target" hint="The timer ring fills up to this. Most answers should take 1.5–2 minutes.">
                <Select id="set-target" value={data.settings.answerTargetSec} onChange={(e) => updateSettings({ answerTargetSec: Number(e.target.value) })}>
                  {[60, 90, 120, 150, 180, 240].map((s) => (
                    <option key={s} value={s}>
                      {formatDuration(s)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Weekly goal" htmlFor="set-goal" hint="Answers to practise each week.">
                <Select id="set-goal" value={data.settings.weeklyGoal} onChange={(e) => updateSettings({ weeklyGoal: Number(e.target.value) })}>
                  {[5, 10, 15, 20, 30, 50].map((n) => (
                    <option key={n} value={n}>
                      {n} answers
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="sm:col-span-2">
                <p className="mb-1.5 text-sm font-medium">Appearance</p>
                <Segmented<ThemePreference>
                  label="Theme"
                  value={data.settings.theme}
                  onChange={(theme) => updateSettings({ theme })}
                  options={[
                    { value: "system", label: "Match system" },
                    { value: "light", label: "Light" },
                    { value: "dark", label: "Dark" },
                  ]}
                />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Your data" description="Everything lives in this browser, so export a backup now and then." />
            <CardBody className="space-y-5">
              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line text-sm sm:grid-cols-5">
                {[
                  ["Questions", data.questions.length],
                  ["Stories", data.stories.length],
                  ["Sessions", data.sessions.length],
                  ["Answers", data.attempts.length],
                  ["Job preps", data.jobPreps.length],
                ].map(([label, n]) => (
                  <div key={label} className="bg-surface px-3 py-2.5">
                    <dt className="text-xs text-muted">{label}</dt>
                    <dd className="font-display text-xl font-semibold tabular-nums">{n}</dd>
                  </div>
                ))}
              </dl>
              <p className="flex items-center gap-2 text-[13px] text-muted">
                <Database className="h-4 w-4" /> Stored in: {driver ? DRIVER_LABEL[driver] : "Loading…"}
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-line p-4">
                  <p className="font-medium">Export</p>
                  <p className="mb-3 mt-0.5 text-[13px] text-muted">Download everything as a JSON file you can import later or on another device.</p>
                  <Button icon={<Download className="h-4 w-4" />} onClick={exportData}>
                    Export data
                  </Button>
                </div>
                <div className="rounded-xl border border-line p-4">
                  <p className="font-medium">Import</p>
                  <p className="mb-3 mt-0.5 text-[13px] text-muted">Restore from an export. You&apos;ll confirm before anything is replaced.</p>
                  <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" id="import-file" onChange={(e) => onFile(e.target.files?.[0])} />
                  <Button icon={<Upload className="h-4 w-4" />} onClick={() => fileRef.current?.click()}>
                    Import data
                  </Button>
                </div>
              </div>
              {importError && (
                <p role="alert" className="rounded-xl bg-rose-soft px-4 py-3 text-sm text-rose-text">
                  {importError}
                </p>
              )}

              <div className="space-y-3 border-t border-line pt-5">
                {hasSamples && (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">Remove sample content</p>
                      <p className="text-[13px] text-muted">Deletes the example questions, stories and history. Your own items stay.</p>
                    </div>
                    <Button size="sm" onClick={() => setConfirmSamples(true)}>
                      Remove samples
                    </Button>
                  </div>
                )}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-rose-text">Reset all data</p>
                    <p className="text-[13px] text-muted">Permanently deletes everything stored by this app in this browser.</p>
                  </div>
                  <Button size="sm" variant="danger" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setConfirmReset(true)}>
                    Reset everything
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Privacy" />
            <CardBody className="space-y-4 text-[14.5px]">
              <p className="flex gap-3">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-pine" />
                <span>
                  <strong>Your interview preparation data is stored locally in this browser.</strong> There is no account and no database. Other people
                  using this site can&apos;t see it, and clearing your browser data deletes it.
                </span>
              </p>
              <p className="flex gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-pine" />
                <span>
                  <strong>AI analysis sends only the answer you&apos;re currently analysing</strong> (with its question, and your target role or job if
                  set) to Groq&apos;s AI service. Job analysis sends the job description you pasted. Nothing is sent unless you press an analyse button.
                </span>
              </p>
              <p className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-pine" />
                <span>
                  That means AI analysis isn&apos;t fully private: the text you analyse leaves your device. Avoid including details you wouldn&apos;t want
                  shared, like other people&apos;s full names.
                </span>
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="AI feedback" />
            <CardBody className="space-y-2 text-sm">
              <p className="flex items-center gap-2">
                <Server className="h-4 w-4 text-muted" />
                {ai === null ? "Checking…" : ai.aiConfigured ? <span>Connected to Groq{ai.model ? ` (${ai.model})` : ""}</span> : <span>Not configured</span>}
              </p>
              <p className="text-[13px] text-muted">
                The Groq API key lives only on the server as the <code className="rounded bg-sunken px-1">GROQ_API_KEY</code> environment variable. It never
                reaches your browser.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>

      <Modal
        open={!!pendingImport}
        onClose={() => setPendingImport(null)}
        title="Replace your data with this import?"
        size="sm"
        footer={
          <>
            <Button onClick={() => setPendingImport(null)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={async () => {
                if (!pendingImport) return;
                try {
                  await replaceAll(pendingImport.data);
                  setName(pendingImport.data.settings.displayName);
                  setRole(pendingImport.data.settings.targetRole);
                  toast.success("Data imported");
                } catch {
                  toast.error("Import failed: the data couldn't be saved to this browser.");
                }
                setPendingImport(null);
              }}
            >
              Replace and import
            </Button>
          </>
        }
      >
        {pendingImport && (
          <div className="space-y-3 text-sm">
            <p className="text-muted">
              <strong className="text-ink">{pendingImport.fileName}</strong> contains:
            </p>
            <ul className="grid grid-cols-2 gap-1">
              {Object.entries(pendingImport.counts).map(([k, v]) => (
                <li key={k}>
                  {v} {k === "jobPreps" ? "job preps" : k === "attempts" ? "answers" : k}
                </li>
              ))}
            </ul>
            <p className="text-muted">Your current data in this browser will be replaced. Export it first if you want to keep a copy.</p>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmSamples}
        onCancel={() => setConfirmSamples(false)}
        title="Remove sample content?"
        message="Sample questions, stories and practice history will be deleted. Anything you created or edited as a new item stays."
        confirmLabel="Remove samples"
        onConfirm={() => {
          removeSampleData();
          setConfirmSamples(false);
          toast.success("Sample content removed");
        }}
      />

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset all data?"
        size="sm"
        footer={
          <>
            <Button onClick={() => setConfirmReset(false)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={async () => {
                try {
                  await resetAll(resetWithSamples);
                  setName("");
                  setRole("");
                  toast.success("All data reset");
                } catch {
                  toast.error("Reset failed. Try again.");
                }
                setConfirmReset(false);
              }}
            >
              Delete everything
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <p className="text-muted">
            This permanently deletes all questions, answers, stories, practice history and job preparations in this browser. It can&apos;t be undone.
          </p>
          <label className="flex items-start gap-3">
            <input type="checkbox" checked={resetWithSamples} onChange={(e) => setResetWithSamples(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--pine)]" />
            Start again with the sample content
          </label>
        </div>
      </Modal>
    </>
  );
}

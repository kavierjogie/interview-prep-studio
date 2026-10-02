"use client";

import { useState, type FormEvent } from "react";
import { CATEGORIES } from "@/lib/categories";
import type { CategoryId, Question } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Field, Select, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { TagInput } from "@/components/ui/TagInput";

export interface QuestionFormValues {
  text: string;
  category: CategoryId;
  tags: string[];
  answer: string;
}

export function QuestionFormModal({
  open,
  onClose,
  onSubmit,
  initial,
  existingTexts = [],
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: QuestionFormValues) => void;
  initial?: Question | null;
  existingTexts?: string[];
}) {
  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit question" : "Add question"} description={initial ? undefined : "Add any question you expect to be asked."}>
      {open && <QuestionForm key={initial?.id ?? "new"} initial={initial} onSubmit={onSubmit} onCancel={onClose} existingTexts={existingTexts} />}
    </Modal>
  );
}

function QuestionForm({
  initial,
  onSubmit,
  onCancel,
  existingTexts,
}: {
  initial?: Question | null;
  onSubmit: (v: QuestionFormValues) => void;
  onCancel: () => void;
  existingTexts: string[];
}) {
  const [text, setText] = useState(initial?.text ?? "");
  const [category, setCategory] = useState<CategoryId>(initial?.category ?? "behavioural");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (t.length < 5) return setError("Enter the full question.");
    if (t.length > 500) return setError("Keep the question under 500 characters.");
    const norm = t.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (existingTexts.some((x) => x.toLowerCase().replace(/[^a-z0-9]/g, "") === norm && x !== initial?.text)) {
      return setError("This question is already in your bank.");
    }
    onSubmit({ text: t, category, tags, answer: answer.trim() });
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="Question" htmlFor="q-text" error={error}>
        <Textarea id="q-text" value={text} onChange={(e) => { setText(e.target.value); setError(null); }} placeholder="e.g. Tell me about a time you had to learn something quickly." className="min-h-20" autoFocus />
      </Field>
      <Field label="Category" htmlFor="q-cat">
        <Select id="q-cat" value={category} onChange={(e) => setCategory(e.target.value as CategoryId)}>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Tags" htmlFor="q-tags" optional hint="Useful for searching, e.g. a company name or skill.">
        <TagInput id="q-tags" value={tags} onChange={setTags} />
      </Field>
      {!initial && (
        <Field label="Your answer" htmlFor="q-answer" optional hint="You can also write this later.">
          <Textarea id="q-answer" value={answer} onChange={(e) => setAnswer(e.target.value)} className="min-h-28" />
        </Field>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary">
          {initial ? "Save changes" : "Add question"}
        </Button>
      </div>
    </form>
  );
}


"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import type { CategoryId, Question } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Input, Select } from "@/components/ui/Field";

/** Searchable multi-select list of questions. Used for story links, practice and custom mock interviews. */
export function QuestionPicker({
  questions,
  selected,
  onChange,
  highlightCategories,
  maxHeight = "max-h-80",
}: {
  questions: Question[];
  selected: string[];
  onChange: (ids: string[]) => void;
  highlightCategories?: CategoryId[];
  maxHeight?: string;
}) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<CategoryId | "all">("all");
  const sel = new Set(selected);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return questions
      .filter((x) => (cat === "all" || x.category === cat) && (!q || x.text.toLowerCase().includes(q) || x.tags.some((t) => t.toLowerCase().includes(q))))
      .sort((a, b) => {
        const ha = highlightCategories?.includes(a.category) ? 0 : 1;
        const hb = highlightCategories?.includes(b.category) ? 0 : 1;
        return ha - hb || a.text.localeCompare(b.text);
      });
  }, [questions, query, cat, highlightCategories]);

  const toggle = (id: string) => onChange(sel.has(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search questions" className="pl-9" aria-label="Search questions" />
        </div>
        <Select value={cat} onChange={(e) => setCat(e.target.value as CategoryId | "all")} aria-label="Filter by category" className="sm:w-52">
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex items-center justify-between text-[0.8125rem] text-muted">
        <span>{selected.length} selected</span>
        <div className="flex gap-3">
          <button type="button" className="hover:text-ink" onClick={() => onChange([...new Set([...selected, ...filtered.map((f) => f.id)])])}>
            Select shown
          </button>
          {selected.length > 0 && (
            <button type="button" className="hover:text-ink" onClick={() => onChange([])}>
              Clear
            </button>
          )}
        </div>
      </div>
      <ul className={cn("divide-y divide-line overflow-y-auto rounded-xl border border-line", maxHeight)}>
        {filtered.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted">No questions match.</li>}
        {filtered.map((q) => (
          <li key={q.id}>
            <label className="flex cursor-pointer items-start gap-3 px-3.5 py-2.5 hover:bg-surface-2">
              <input type="checkbox" checked={sel.has(q.id)} onChange={() => toggle(q.id)} className="mt-1 h-4 w-4 accent-[var(--pine)]" />
              <span className="min-w-0">
                <span className="block text-[0.90625rem]">{q.text}</span>
                <span className="text-xs text-faint">{CATEGORIES.find((c) => c.id === q.category)?.label}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = "Add a tag and press Enter",
  id,
  max = 20,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  id?: string;
  max?: number;
}) {
  const [draft, setDraft] = useState("");
  const autoId = useId();
  const inputId = id ?? autoId;
  const lower = value.map((v) => v.toLowerCase());

  const add = (raw: string) => {
    const t = raw.trim().replace(/,$/, "").slice(0, 40);
    if (!t || lower.includes(t.toLowerCase()) || value.length >= max) return;
    onChange([...value, t]);
    setDraft("");
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  const available = suggestions.filter((s) => !lower.includes(s.toLowerCase()));

  return (
    <div className="space-y-2">
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-[10px] border border-line-strong bg-surface px-2 py-1.5 focus-within:border-pine focus-within:ring-2 focus-within:ring-pine/20">
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-sunken py-0.5 pl-2.5 pr-1 text-[13px]">
            {tag}
            <button type="button" aria-label={`Remove ${tag}`} onClick={() => onChange(value.filter((t) => t !== tag))} className="rounded-full p-0.5 text-faint hover:bg-line hover:text-ink">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          id={inputId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => draft && add(draft)}
          placeholder={value.length ? "" : placeholder}
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-[15px] outline-none placeholder:text-faint"
        />
      </div>
      {available.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {available.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className={cn("rounded-full border border-dashed border-line-strong px-2.5 py-0.5 text-[13px] text-muted hover:border-pine hover:text-pine-text")}
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

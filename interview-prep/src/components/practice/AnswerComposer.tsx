"use client";

import { forwardRef } from "react";
import type { InputMethod } from "@/lib/types";
import { estimateSpeakingSec } from "@/lib/local-checks";
import { formatDuration, wordCount } from "@/lib/utils";
import { Textarea } from "@/components/ui/Field";

/**
 * The single place where a practice answer is captured.
 *
 * Today only `method="text"` exists. To add voice later, implement a recorder component that:
 *   1. records audio (MediaRecorder) and stores the blob in a separate IndexedDB store,
 *   2. transcribes it (e.g. a new server route calling Groq's Whisper endpoint),
 *   3. calls `onChange(transcript)` and passes `media` metadata up with the submission.
 * The runner, attempts, local checks and AI analysis all work on the resulting text,
 * so nothing else needs rebuilding.
 */
export interface AnswerComposerProps {
  method: InputMethod;
  value: string;
  onChange: (value: string) => void;
  onActivity?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export const AnswerComposer = forwardRef<HTMLTextAreaElement, AnswerComposerProps>(function AnswerComposer(
  { value, onChange, onActivity, placeholder, disabled },
  ref,
) {
  const words = wordCount(value);
  return (
    <div>
      <Textarea
        ref={ref}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          onActivity?.();
        }}
        placeholder={placeholder ?? "Type your answer as you would say it…"}
        className="min-h-48 text-[16px] leading-relaxed sm:min-h-56"
        aria-label="Your answer"
      />
      <p className="mt-1.5 text-right text-xs text-faint" aria-live="polite">
        {words > 0 ? `${words} words, about ${formatDuration(estimateSpeakingSec(value))} spoken` : "Your answer is only saved when you submit."}
      </p>
    </div>
  );
});

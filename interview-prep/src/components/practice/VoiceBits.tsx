import { Mic } from "lucide-react";
import type { PracticeAttempt } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";

export function VoiceBadge({ attempt }: { attempt: Pick<PracticeAttempt, "inputMethod"> }) {
  if (attempt.inputMethod !== "voice") return null;
  return (
    <Badge tone="outline" icon={<Mic className="h-3 w-3" />}>
      Voice
    </Badge>
  );
}

/** Shows what speech recognition heard, when the user corrected it before submitting. */
export function HeardTranscript({ attempt }: { attempt: Pick<PracticeAttempt, "answer" | "originalTranscript"> }) {
  const heard = attempt.originalTranscript;
  if (!heard || heard.trim() === attempt.answer.trim()) return null;
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-muted hover:text-ink">Original transcript, before your edits</summary>
      <p className="mt-2 whitespace-pre-line text-muted">{heard}</p>
    </details>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, History, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import type { PracticeSession } from "@/lib/types";
import { formatDuration, relativeTime } from "@/lib/utils";
import { RatingBadge } from "@/components/questions/QuestionBits";
import { Badge } from "@/components/ui/Badge";
import { Collapsible } from "@/components/ui/Collapsible";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

export function SessionHistory({ limit = 8, mode }: { limit?: number; mode?: PracticeSession["mode"] }) {
  const { data, deleteSession } = useStore();
  const toast = useToast();
  const [showAll, setShowAll] = useState(false);
  const [toDelete, setToDelete] = useState<PracticeSession | null>(null);

  const sessions = data.sessions
    .filter((s) => (!mode || s.mode === mode) && s.attemptIds.length > 0)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const shown = showAll ? sessions : sessions.slice(0, limit);

  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={<History className="h-7 w-7" />}
        title="No sessions yet"
        description="Completed practice sessions and mock interviews will appear here."
      />
    );
  }

  return (
    <div className="space-y-2">
      {shown.map((s) => {
        const attempts = data.attempts.filter((a) => a.sessionId === s.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        const answered = attempts.filter((a) => !a.skipped).length;
        return (
          <Collapsible
            key={s.id}
            title={
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>{s.label}</span>
                <Badge tone={s.mode === "mock" ? "sky" : "neutral"}>{s.mode === "mock" ? "Mock" : "Practice"}</Badge>
                <span className="text-xs font-normal text-muted">
                  {relativeTime(s.startedAt)}, {answered} answered, {formatDuration(s.totalDurationSec)}
                </span>
                {!s.endedAt && <Badge tone="marigold">Unfinished</Badge>}
              </span>
            }
          >
            <ul className="space-y-2">
              {attempts.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  {a.questionId && data.questions.some((q) => q.id === a.questionId) ? (
                    <Link href={`/questions/${a.questionId}`} className="min-w-0 flex-1 hover:underline">
                      {a.questionText}
                    </Link>
                  ) : (
                    <span className="min-w-0 flex-1">{a.questionText}</span>
                  )}
                  <span className="flex items-center gap-2">
                    {a.skipped ? <Badge>Skipped</Badge> : <span className="text-xs text-faint">{formatDuration(a.durationSec)}</span>}
                    <RatingBadge rating={a.selfRating} />
                    {a.feedback && <Badge tone="sky">AI feedback</Badge>}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
              {s.mode === "mock" ? (
                <Link href={`/mock/${s.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-pine-text hover:underline">
                  View summary <ChevronRight className="h-4 w-4" />
                </Link>
              ) : (
                <span />
              )}
              <button type="button" onClick={() => setToDelete(s)} className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-rose-text">
                <Trash2 className="h-3.5 w-3.5" /> Delete session
              </button>
            </div>
          </Collapsible>
        );
      })}
      {sessions.length > limit && (
        <button type="button" onClick={() => setShowAll((x) => !x)} className="w-full py-2 text-sm font-medium text-muted hover:text-ink">
          {showAll ? "Show fewer" : `Show all ${sessions.length} sessions`}
        </button>
      )}
      <ConfirmDialog
        open={!!toDelete}
        onCancel={() => setToDelete(null)}
        title="Delete this session?"
        message="Its attempts and any AI feedback on them will be removed from your history. Your questions and saved answers are not affected."
        confirmLabel="Delete session"
        onConfirm={() => {
          if (toDelete) deleteSession(toDelete.id);
          setToDelete(null);
          toast.success("Session deleted");
        }}
      />
    </div>
  );
}

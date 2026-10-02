"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, Keyboard, Mic, MicOff, Pencil, RotateCcw, Square, X } from "lucide-react";
import { estimateSpeakingSec } from "@/lib/local-checks";
import { voiceErrorMessage } from "@/lib/speech";
import type { VoiceAnswer } from "@/lib/use-voice-answer";
import { cn, formatClock, formatDuration, wordCount } from "@/lib/utils";
import { Button, Spinner } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";

const COPY = {
  ready: { title: "Ready when you are", hint: "Press the microphone and answer out loud, as you would in the room. Your words appear as you speak." },
  requesting: { title: "Waiting for your microphone", hint: "Allow microphone access when your browser asks." },
  listening: { title: "Listening…", hint: "" },
  processing: { title: "Finishing your transcript…", hint: "Catching your last few words." },
  stopped: { title: "Recording stopped", hint: "Read it back and fix anything that was misheard, like names or technical terms." },
  error: { title: "Recording problem", hint: "" },
} as const;

/**
 * The voice half of the answer area. Shows the microphone state, the live transcript while speaking,
 * and an editable transcript afterwards. `value` is the answer that gets submitted.
 */
export function VoiceComposer({
  voice,
  value,
  onChange,
  elapsed,
  onStart,
  onCancel,
  onSwitchToText,
}: {
  voice: VoiceAnswer;
  value: string;
  onChange: (value: string) => void;
  elapsed: number;
  onStart: () => void;
  onCancel: () => void;
  onSwitchToText: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const { status } = voice;
  const recording = status === "listening";
  const busy = voice.active;
  const hasAnswer = value.trim() !== "";

  // Escape abandons the current take.
  useEffect(() => {
    if (!busy) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  if (!voice.supported) {
    return (
      <div role="note" className="rounded-2xl border border-line bg-surface-2 p-5">
        <p className="flex items-center gap-2 font-medium">
          <MicOff className="h-4 w-4 text-muted" /> Voice answers aren&apos;t available in this browser
        </p>
        <p className="mt-1 text-sm text-muted">{voiceErrorMessage("unsupported")}</p>
        <Button className="mt-4" icon={<Keyboard className="h-4 w-4" />} onClick={onSwitchToText}>
          Type your answer instead
        </Button>
      </div>
    );
  }

  const start = () => {
    setEditing(false);
    onStart();
  };

  const copy = status === "stopped" && !hasAnswer ? { title: "We didn't catch anything", hint: "Try again a little closer to the microphone, or type your answer." } : COPY[status];
  const announce = status === "error" ? voice.errorMessage : copy.title;

  return (
    <section aria-label="Voice answer" className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex flex-col items-center px-5 pb-6 pt-8 text-center sm:pt-10">
        <MicButton status={status} onStart={start} onStop={voice.stop} again={hasAnswer} />
        <p className="mt-5 font-display text-xl font-semibold">{copy.title}</p>
        {recording ? (
          <p className="mt-1 font-display text-lg tabular-nums text-rose-text" aria-label={`Answering for ${formatDuration(Math.round(elapsed))}`}>
            {formatClock(elapsed)}
          </p>
        ) : (
          copy.hint && <p className="mt-1 max-w-md text-sm text-muted">{copy.hint}</p>
        )}
        <p className="sr-only" aria-live="assertive">
          {announce}
        </p>
      </div>

      {status === "error" && voice.errorMessage && (
        <div role="alert" className="mx-5 mb-5 flex items-start gap-2.5 rounded-xl bg-rose-soft p-3.5 text-left text-sm text-rose-text">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <p>{voice.errorMessage}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-medium">
              <button type="button" onClick={start} className="underline underline-offset-2">
                Try again
              </button>
              <button type="button" onClick={onSwitchToText} className="underline underline-offset-2">
                Type instead
              </button>
            </div>
          </div>
        </div>
      )}

      {(recording || status === "processing") && (
        <div className="border-t border-line bg-surface-2 px-5 py-4">
          <p className="min-h-16 whitespace-pre-line text-left text-[1rem] leading-relaxed" aria-live="off">
            {voice.transcript || voice.interim ? (
              <>
                {voice.transcript} <span className="text-faint">{voice.interim}</span>
              </>
            ) : (
              <span className="text-faint">Start speaking. Your words will appear here.</span>
            )}
          </p>
        </div>
      )}

      {!busy && hasAnswer && (
        <div className="border-t border-line px-5 py-4 text-left">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm font-medium" id="voice-answer-label">
              Your answer
            </p>
            <p className="text-xs text-faint">
              {wordCount(value)} words, about {formatDuration(estimateSpeakingSec(value))} spoken
            </p>
          </div>
          {editing ? (
            <Textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              aria-labelledby="voice-answer-label"
              className="min-h-40 text-[1rem] leading-relaxed"
              autoFocus
            />
          ) : (
            <p className="whitespace-pre-line text-[1rem] leading-relaxed">{value}</p>
          )}
          {voice.audioUrl && (
            <audio controls preload="metadata" src={voice.audioUrl} className="mt-4 h-10 w-full" aria-label="Replay your recording">
              Your browser can&apos;t play the recording.
            </audio>
          )}
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-2 border-t border-line bg-surface-2 px-5 py-3">
        {busy ? (
          <>
            {recording && (
              <Button icon={<Square className="h-3.5 w-3.5 fill-current" />} onClick={voice.stop}>
                Stop recording
              </Button>
            )}
            <Button variant="ghost" icon={<X className="h-4 w-4" />} onClick={onCancel}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            {hasAnswer && (
              <Button
                variant={editing ? "primary" : "secondary"}
                icon={editing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                onClick={() => setEditing((e) => !e)}
                aria-pressed={editing}
              >
                {editing ? "Done editing" : "Edit transcript"}
              </Button>
            )}
            <Button variant={hasAnswer ? "ghost" : "secondary"} icon={hasAnswer ? <RotateCcw className="h-4 w-4" /> : <Mic className="h-4 w-4" />} onClick={start}>
              {hasAnswer ? "Record again" : "Start recording"}
            </Button>
          </>
        )}
      </div>
    </section>
  );
}

function MicButton({ status, onStart, onStop, again }: { status: VoiceAnswer["status"]; onStart: () => void; onStop: () => void; again: boolean }) {
  const recording = status === "listening";
  const waiting = status === "requesting" || status === "processing";
  return (
    <div className="relative flex h-20 w-20 items-center justify-center">
      {recording && (
        <>
          <span className="mic-ring absolute inset-0 rounded-full bg-rose/30" aria-hidden="true" />
          <span className="mic-ring absolute inset-0 rounded-full bg-rose/20 [animation-delay:0.8s]" aria-hidden="true" />
        </>
      )}
      <button
        type="button"
        onClick={recording ? onStop : onStart}
        disabled={waiting}
        aria-label={recording ? "Stop recording" : waiting ? (status === "requesting" ? "Waiting for microphone permission" : "Finishing transcript") : again ? "Record again" : "Start recording"}
        className={cn(
          "press relative flex h-20 w-20 items-center justify-center rounded-full shadow-lg disabled:cursor-wait",
          recording ? "bg-rose text-white" : waiting ? "bg-sunken text-muted" : "bg-pine text-pine-ink hover:bg-pine-hover",
        )}
      >
        {waiting ? <Spinner className="h-7 w-7" /> : recording ? <Square className="h-6 w-6 fill-current" /> : <Mic className="h-8 w-8" />}
      </button>
    </div>
  );
}

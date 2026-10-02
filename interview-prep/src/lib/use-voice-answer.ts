"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getRecognizerCtor,
  joinText,
  micErrorCode,
  readResults,
  recognitionErrorCode,
  voiceErrorMessage,
  type Recognizer,
  type VoiceErrorCode,
} from "./speech";

export type VoiceStatus = "ready" | "requesting" | "listening" | "processing" | "stopped" | "error";

/** Recognisers end on their own after pauses; we restart them, but give up after this many restarts with no words. */
const MAX_SILENT_RESTARTS = 8;
/** How long to wait for the last words to settle after Stop before finishing anyway. */
const FINALISE_TIMEOUT_MS = 2500;

interface Take {
  rec: Recognizer | null;
  stream: MediaStream | null;
  recorder: MediaRecorder | null;
  chunks: Blob[];
  /** True while the user wants to keep recording (so an `end` event means "restart"). */
  want: boolean;
  started: boolean;
  done: boolean;
  cancelled: boolean;
  discardAudio: boolean;
  /** Text settled in earlier recogniser runs of this take, and in the current run. */
  committed: string;
  current: string;
  silentRestarts: number;
  error: VoiceErrorCode | null;
  finaliseTimer?: ReturnType<typeof setTimeout>;
}

function releaseMic(take: Take) {
  if (take.recorder && take.recorder.state !== "inactive") take.recorder.stop();
  take.stream?.getTracks().forEach((t) => t.stop());
  take.recorder = null;
  take.stream = null;
}

/**
 * One spoken answer: asks for the microphone, transcribes live with the browser's speech recogniser,
 * and keeps an in-memory recording for replay (never uploaded or stored).
 *
 * `onTranscript` receives the settled transcript as it grows; `onListening`/`onStopped` fire when the
 * microphone is actually live and when it stops, so callers can drive an answer timer from them.
 */
export function useVoiceAnswer({
  onTranscript,
  onListening,
  onStopped,
}: {
  onTranscript: (text: string) => void;
  onListening?: () => void;
  onStopped?: () => void;
}) {
  const [supported] = useState(() => getRecognizerCtor() !== null);
  const [status, setStatus] = useState<VoiceStatus>("ready");
  const [error, setError] = useState<VoiceErrorCode | null>(null);
  /** Raw recognised text of the latest take, before any edits. */
  const [transcript, setTranscript] = useState("");
  /** Words the recogniser hasn't settled yet. */
  const [interim, setInterim] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const cb = useRef({ onTranscript, onListening, onStopped });
  useEffect(() => {
    cb.current = { onTranscript, onListening, onStopped };
  });

  const takeRef = useRef<Take | null>(null);
  const snapshot = useRef<{ transcript: string; status: VoiceStatus }>({ transcript: "", status: "ready" });
  const urlRef = useRef<string | null>(null);

  const setUrl = useCallback((url: string | null) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = url;
    setAudioUrl(url);
  }, []);

  const finish = useCallback((take: Take) => {
    if (take.done) return;
    take.done = true;
    clearTimeout(take.finaliseTimer);
    if (takeRef.current === take) takeRef.current = null;
    take.rec?.abort();
    releaseMic(take);
    setInterim("");
    if (take.cancelled) return;
    // A failure before any words were heard keeps the previous answer instead of blanking it.
    setTranscript(take.error && !take.committed ? snapshot.current.transcript : take.committed);
    setError(take.error);
    setStatus(take.error ? "error" : "stopped");
    if (take.started) cb.current.onStopped?.();
  }, []);

  const listen = useCallback(
    (take: Take) => {
      const Ctor = getRecognizerCtor()!;
      const rec = new Ctor();
      // ponytail: Android Chrome repeats earlier words in continuous mode, so it gets one-utterance runs that we restart.
      rec.continuous = !/Android/i.test(navigator.userAgent);
      rec.interimResults = true;
      rec.lang = navigator.language || "en-GB";

      rec.onstart = () => {
        if (take.started || take.done) return;
        take.started = true;
        setTranscript("");
        setStatus("listening");
        cb.current.onListening?.();
      };
      rec.onresult = (e) => {
        const { final, interim: pending } = readResults(e.results);
        take.current = final;
        take.silentRestarts = 0;
        const text = joinText(take.committed, final);
        setTranscript(text);
        setInterim(pending);
        cb.current.onTranscript(text);
      };
      rec.onerror = (e) => {
        const code = recognitionErrorCode(e.error);
        if (!code) return;
        if (code === "no-mic" && take.recorder) {
          // Some phones can't share the microphone between the recorder and the recogniser.
          // Drop replay and keep transcribing; the restart in `onend` picks the mic back up.
          take.discardAudio = true;
          releaseMic(take);
          return;
        }
        take.want = false;
        take.error = code;
      };
      rec.onend = () => {
        take.committed = joinText(take.committed, take.current);
        take.current = "";
        setInterim("");
        if (take.done) return;
        if (take.want) {
          if (++take.silentRestarts > MAX_SILENT_RESTARTS) {
            take.want = false;
            take.error = "silence";
          } else {
            try {
              rec.start();
              return;
            } catch {
              take.want = false;
              take.error = "unknown";
            }
          }
        }
        finish(take);
      };

      take.rec = rec;
      try {
        rec.start();
      } catch {
        take.error = "unknown";
        finish(take);
      }
    },
    [finish],
  );

  const start = useCallback(async () => {
    if (takeRef.current) return;
    snapshot.current = { transcript, status: status === "error" ? (transcript ? "stopped" : "ready") : status };
    const take: Take = {
      rec: null,
      stream: null,
      recorder: null,
      chunks: [],
      want: true,
      started: false,
      done: false,
      cancelled: false,
      discardAudio: false,
      committed: "",
      current: "",
      silentRestarts: 0,
      error: null,
    };
    takeRef.current = take;
    setError(null);
    setInterim("");

    if (!getRecognizerCtor()) {
      take.error = "unsupported";
      return finish(take);
    }
    setStatus("requesting");

    if (navigator.mediaDevices?.getUserMedia) {
      try {
        take.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        take.error = micErrorCode(err);
        return finish(take);
      }
      if (take.done) {
        // Cancelled while the permission prompt was open.
        releaseMic(take);
        return;
      }
      if (typeof MediaRecorder !== "undefined") {
        try {
          const recorder = new MediaRecorder(take.stream);
          recorder.ondataavailable = (e) => {
            if (e.data.size) take.chunks.push(e.data);
          };
          recorder.onstop = () => {
            if (take.cancelled || take.discardAudio || !take.chunks.length) return;
            setUrl(URL.createObjectURL(new Blob(take.chunks, { type: recorder.mimeType })));
          };
          recorder.start();
          take.recorder = recorder;
        } catch {
          /* Replay is optional; transcription still works. */
        }
      }
    } else if (!window.isSecureContext) {
      take.error = "insecure";
      return finish(take);
    }
    // Without getUserMedia the recogniser asks for the microphone itself.
    listen(take);
  }, [finish, listen, setUrl, status, transcript]);

  /** Abandons the current take and returns to what was there before it. */
  const cancel = useCallback(() => {
    const take = takeRef.current;
    if (!take) return;
    take.cancelled = true;
    take.want = false;
    finish(take);
    setTranscript(snapshot.current.transcript);
    setError(null);
    setStatus(snapshot.current.status);
  }, [finish]);

  /** Stops listening and keeps everything said so far. */
  const stop = useCallback(() => {
    const take = takeRef.current;
    if (!take) return;
    if (!take.started) return cancel(); // nothing heard yet
    take.want = false;
    setStatus("processing");
    try {
      take.rec?.stop();
    } catch {
      /* already ending */
    }
    take.finaliseTimer = setTimeout(() => finish(take), FINALISE_TIMEOUT_MS);
  }, [cancel, finish]);

  /** Clears everything, ready for the next question. */
  const reset = useCallback(() => {
    const take = takeRef.current;
    if (take) {
      take.cancelled = true;
      finish(take);
    }
    setUrl(null);
    setTranscript("");
    setInterim("");
    setError(null);
    setStatus("ready");
  }, [finish, setUrl]);

  // Release the microphone and the replay audio if the page unmounts mid-recording.
  useEffect(
    () => () => {
      const take = takeRef.current;
      if (take) {
        take.cancelled = true;
        take.rec?.abort();
        releaseMic(take);
      }
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  return {
    supported,
    status,
    active: status === "requesting" || status === "listening" || status === "processing",
    error,
    errorMessage: error ? voiceErrorMessage(error) : null,
    transcript,
    interim,
    audioUrl,
    start,
    stop,
    cancel,
    reset,
  };
}

export type VoiceAnswer = ReturnType<typeof useVoiceAnswer>;

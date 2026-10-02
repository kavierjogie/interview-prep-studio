/**
 * Browser speech recognition (Web Speech API) helpers. Audio never leaves the browser's own
 * recogniser; only the final, user-edited transcript is ever sent to /api/analyze.
 */

/** The subset of the (still prefixed in most browsers) SpeechRecognition API this app uses. */
export interface Recognizer {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onresult: ((e: { results: SpeechRecognitionResultList }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type RecognizerCtor = new () => Recognizer;

export function getRecognizerCtor(): RecognizerCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognizerCtor; webkitSpeechRecognition?: RecognizerCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Joins transcript pieces with single spaces (recognisers often lead results with a space). */
export function joinText(...parts: string[]): string {
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/** Splits a recognition event's results into settled (final) text and the in-progress guess. */
export function readResults(results: ArrayLike<{ isFinal: boolean; [index: number]: { transcript: string } }>): { final: string; interim: string } {
  const final: string[] = [];
  const interim: string[] = [];
  for (let i = 0; i < results.length; i++) {
    (results[i].isFinal ? final : interim).push(results[i][0].transcript);
  }
  return { final: joinText(...final), interim: joinText(...interim) };
}

export type VoiceErrorCode =
  | "unsupported"
  | "insecure"
  | "denied"
  | "no-mic"
  | "mic-busy"
  | "network"
  | "service"
  | "language"
  | "silence"
  | "unknown";

const MESSAGES: Record<VoiceErrorCode, string> = {
  unsupported: "Voice transcription isn't supported in this browser. Try Chrome, Edge or Safari, or type your answer instead.",
  insecure: "The microphone only works on a secure (https) connection. Open the app over https or on localhost, or type your answer instead.",
  denied:
    "Microphone access is blocked. Allow it from the icon in your browser's address bar (or your phone's site settings), then try again.",
  "no-mic": "No microphone was found. Connect one, or type your answer instead.",
  "mic-busy": "Your microphone is being used by another app or tab. Close it there, then try again.",
  network: "Speech recognition needs an internet connection in this browser. Check your connection and try again.",
  service: "Speech recognition is turned off on this device. On iPhone or iPad, turn on Siri & Dictation in Settings, or type your answer instead.",
  language: "Speech recognition doesn't support your browser's language. Change the browser language, or type your answer instead.",
  silence: "We couldn't hear anything for a while, so recording stopped. Check your microphone and try again.",
  unknown: "Speech recognition stopped unexpectedly. Try again, or type your answer instead.",
};

export function voiceErrorMessage(code: VoiceErrorCode): string {
  return MESSAGES[code];
}

/** Maps a SpeechRecognition `error` value to our codes. `null` means the error is benign and recording continues. */
export function recognitionErrorCode(error: string): VoiceErrorCode | null {
  switch (error) {
    case "no-speech": // a pause in speaking; the recogniser restarts
    case "aborted": // we stopped it ourselves
      return null;
    case "not-allowed":
      return "denied";
    case "service-not-allowed":
      return "service";
    case "audio-capture":
      return "no-mic";
    case "network":
      return "network";
    case "language-not-supported":
      return "language";
    default:
      return "unknown";
  }
}

/** Maps a getUserMedia rejection to our codes. */
export function micErrorCode(err: unknown): VoiceErrorCode {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "no-mic";
  if (name === "NotReadableError" || name === "AbortError") return "mic-busy";
  return "unknown";
}

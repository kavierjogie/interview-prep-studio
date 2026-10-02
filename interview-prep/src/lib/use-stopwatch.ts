"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Wall-clock based stopwatch (accurate even if the tab is throttled in the background). */
export function useStopwatch() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef<number | null>(null);
  const accumulated = useRef(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      if (startedAt.current != null) setElapsed(accumulated.current + (Date.now() - startedAt.current) / 1000);
    }, 250);
    return () => clearInterval(id);
  }, [running]);

  const start = useCallback(() => {
    if (startedAt.current != null) return;
    startedAt.current = Date.now();
    setRunning(true);
  }, []);

  const pause = useCallback(() => {
    if (startedAt.current == null) return;
    accumulated.current += (Date.now() - startedAt.current) / 1000;
    startedAt.current = null;
    setElapsed(accumulated.current);
    setRunning(false);
  }, []);

  const reset = useCallback(() => {
    startedAt.current = null;
    accumulated.current = 0;
    setElapsed(0);
    setRunning(false);
  }, []);

  /** Current elapsed seconds, read synchronously (for submit). */
  const read = useCallback(
    () => accumulated.current + (startedAt.current != null ? (Date.now() - startedAt.current) / 1000 : 0),
    [],
  );

  return { running, elapsed, start, pause, reset, read };
}

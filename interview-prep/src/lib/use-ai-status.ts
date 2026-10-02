"use client";

import { useEffect, useState } from "react";
import { fetchAiStatus, type AiStatus } from "./ai-client";

/** null while loading. */
export function useAiStatus(): AiStatus | null {
  const [status, setStatus] = useState<AiStatus | null>(null);
  useEffect(() => {
    let alive = true;
    fetchAiStatus().then((s) => alive && setStatus(s));
    return () => {
      alive = false;
    };
  }, []);
  return status;
}

"use client";

import { useEffect } from "react";

/**
 * Warns before unsaved edits are lost: on tab close/reload (beforeunload) and on in-app link clicks,
 * which beforeunload doesn't see because Next.js navigates client-side.
 * ponytail: browser Back isn't caught; add a popstate guard if that becomes a real complaint.
 */
export function useUnsavedGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.("a[href]");
      if (!link || link.getAttribute("target") === "_blank" || link.getAttribute("href")?.startsWith("#")) return;
      if (window.confirm("You have unsaved changes. Leave without saving?")) return;
      // Capture phase on document runs before React's listener, so the Link never sees the click.
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("beforeunload", onUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);
}

"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";
export interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
  action?: ToastAction;
  leaving?: boolean;
}

interface ToastApi {
  success(message: string, action?: ToastAction): void;
  error(message: string): void;
  info(message: string): void;
}

const EXIT_MS = 160;

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const next = useRef(1);

  /** Plays the exit animation, then removes the toast. */
  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.map((x) => (x.id === id ? { ...x, leaving: true } : x)));
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), EXIT_MS);
  }, []);
  const push = useCallback(
    (tone: ToastTone, message: string, action?: ToastAction) => {
      const id = next.current++;
      setToasts((t) => [...t.slice(-3), { id, tone, message, action }]);
      // Toasts with an action (e.g. Undo) stay long enough to reach for it.
      setTimeout(() => dismiss(id), tone === "error" ? 7000 : action ? 6000 : 3500);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({ success: (m, a) => push("success", m, a), error: (m) => push("error", m), info: (m) => push("info", m) }),
    [push],
  );

  const icons = { success: CheckCircle2, error: AlertCircle, info: Info };
  const toneCls = { success: "text-pine-text", error: "text-rose-text", info: "text-sky-text" };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:pr-6">
        {toasts.map((t) => {
          const Icon = icons[t.tone];
          return (
            <div
              key={t.id}
              role={t.tone === "error" ? "alert" : "status"}
              className={cn(
                t.leaving ? "animate-toast-out pointer-events-none" : "animate-toast pointer-events-auto",
                "flex w-full max-w-sm items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm shadow-lg",
              )}
            >
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", toneCls[t.tone])} />
              <p className="flex-1 text-ink">{t.message}</p>
              {t.action && (
                <button
                  type="button"
                  onClick={() => {
                    t.action?.onClick();
                    dismiss(t.id);
                  }}
                  className="press -my-0.5 rounded-md px-1.5 py-0.5 font-semibold text-pine-text hover:bg-pine-soft"
                >
                  {t.action.label}
                </button>
              )}
              <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="press text-faint hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

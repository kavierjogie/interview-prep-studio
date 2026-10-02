import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Native <details>: keyboard and screen-reader support built in; open/close motion lives in globals.css. */
export function Collapsible({ title, children, defaultOpen = false, className }: { title: ReactNode; children: ReactNode; defaultOpen?: boolean; className?: string }) {
  return (
    <details open={defaultOpen} className={cn("group rounded-xl border border-line", className)}>
      <summary className="flex cursor-pointer list-none rounded-xl transition-colors hover:bg-surface-2 active:bg-sunken group-open:rounded-b-none items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">{title}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-faint transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-line px-4 py-3">{children}</div>
    </details>
  );
}

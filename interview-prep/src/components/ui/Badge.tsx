import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "pine" | "marigold" | "rose" | "sky" | "outline";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-sunken text-muted",
  pine: "bg-pine-soft text-pine-text",
  marigold: "bg-marigold-soft text-marigold-text",
  rose: "bg-rose-soft text-rose-text",
  sky: "bg-sky-soft text-sky-text",
  outline: "border border-line text-muted",
};

export function Badge({ tone = "neutral", children, className, icon }: { tone?: BadgeTone; children: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <span className={cn("inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}>
      {icon}
      <span className="truncate">{children}</span>
    </span>
  );
}

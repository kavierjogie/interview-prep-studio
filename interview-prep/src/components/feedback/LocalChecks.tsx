import { CheckCircle2, CircleAlert } from "lucide-react";
import type { LocalCheck } from "@/lib/local-checks";
import { cn } from "@/lib/utils";

export function LocalChecks({ checks }: { checks: LocalCheck[] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {checks.map((c) => (
        <li key={c.id} className={cn("flex gap-2.5 rounded-xl border p-3", c.passed ? "border-line" : "border-marigold/40 bg-marigold-soft/40")}>
          {c.passed ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-pine" /> : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-marigold" />}
          <div>
            <p className="text-sm font-medium">{c.label}</p>
            <p className="text-[13px] text-muted">{c.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  max = 100,
  tone = "pine",
  className,
  label,
}: {
  value: number;
  max?: number;
  tone?: "pine" | "marigold" | "rose" | "ink";
  className?: string;
  label?: string;
}) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  const colors = { pine: "bg-pine", marigold: "bg-marigold", rose: "bg-rose", ink: "bg-ink" };
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-sunken", className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className={cn("h-full rounded-full transition-[width] duration-500", colors[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function ProgressRing({
  value,
  size = 120,
  stroke = 10,
  tone = "pine",
  children,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: "pine" | "marigold";
  children?: ReactNode;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={label ?? `${Math.round(pct)}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--sunken)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone === "pine" ? "var(--pine)" : "var(--marigold)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          style={{ transition: "stroke-dashoffset 600ms ease, stroke 300ms" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

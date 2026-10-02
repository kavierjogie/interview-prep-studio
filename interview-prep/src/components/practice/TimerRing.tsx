import { ProgressRing } from "@/components/ui/Progress";
import { formatClock } from "@/lib/utils";

export function TimerRing({ elapsed, targetSec, running, size = 132 }: { elapsed: number; targetSec: number; running: boolean; size?: number }) {
  const over = elapsed > targetSec;
  const pct = over ? 100 : (elapsed / targetSec) * 100;
  return (
    <ProgressRing value={pct} size={size} stroke={8} tone={over ? "marigold" : "pine"} label={`Elapsed ${formatClock(elapsed)} of ${formatClock(targetSec)} target`}>
      <span className="font-display text-[1.75rem] font-semibold tabular-nums leading-none" aria-live="off">
        {formatClock(elapsed)}
      </span>
      <span className={over ? "mt-1 text-[0.6875rem] font-medium text-marigold-text" : "mt-1 text-[0.6875rem] text-faint"}>
        {over ? "Over target" : running ? `of ${formatClock(targetSec)}` : elapsed > 0 ? "Paused" : `Target ${formatClock(targetSec)}`}
      </span>
    </ProgressRing>
  );
}

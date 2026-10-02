export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
        <rect x="1" y="5" width="20" height="16" rx="4" fill="var(--pine)" />
        <rect x="7" y="9" width="20" height="16" rx="4" fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.6" />
        <path d="M11.5 14.5h11M11.5 18.5h7" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      {!compact && <span className="font-display text-[17px] font-semibold tracking-tight">Interview Prep Studio</span>}
    </span>
  );
}

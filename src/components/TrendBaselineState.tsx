/** Shared "not enough history yet" placeholder for a trend card -- a
 * dashed flat line instead of blank space, plus a headline explaining a
 * second data point is what's missing. Used by Overview's cross-cycle
 * trend cards and the Results page's "Change vs last survey" tile. */
export function TrendBaselineState({ heading, body }: { heading: string; body: string }) {
  return (
    <>
      <p className="mt-2 text-[15px] font-semibold text-[var(--ink)]">{heading}</p>
      <p className="mt-0.5 secondary-text">{body}</p>
      <svg viewBox="0 0 280 60" className="mt-2 h-14 w-full" aria-hidden="true">
        <path d="M0,30 L280,30" fill="none" stroke="var(--ink-faint)" strokeWidth={2} strokeDasharray="4 5" strokeLinecap="round" />
      </svg>
    </>
  );
}

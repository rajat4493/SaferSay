/**
 * Loading placeholders matching the Ink & Cream design tokens -- replaces
 * plain "Loading..." text (flagged repeatedly in the UX audit) with a
 * shape that previews the content about to arrive.
 */
export function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[var(--radius-input)] bg-[var(--brand-line-soft)] motion-reduce:animate-none ${className}`}
    />
  );
}

export function SkeletonText({ lines = 1, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonBlock key={index} className={`h-3 ${index === lines - 1 && lines > 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border border-[var(--brand-glass-border)] bg-[var(--brand-glass-strong)] p-5 shadow-[var(--shadow-soft)] ${className}`}
    >
      <SkeletonBlock className="h-4 w-1/3" />
      <div className="mt-4">
        <SkeletonText lines={2} />
      </div>
    </div>
  );
}

export function SkeletonRow({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 border-b border-[var(--brand-border)] p-3 last:border-b-0 ${className}`}>
      <SkeletonBlock className="h-9 w-9 shrink-0 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <SkeletonBlock className="h-3.5 w-1/3" />
        <SkeletonBlock className="h-3 w-1/2" />
      </div>
    </div>
  );
}

/** Small inline spinner + label used for button-progress text ("Sending..."). */
export function InlineSpinnerRow({ label }: { label: string }) {
  return (
    <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-[var(--brand-muted)]">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--brand-border)] border-t-[var(--brand-accent)] motion-reduce:animate-none" />
      {label}...
    </p>
  );
}

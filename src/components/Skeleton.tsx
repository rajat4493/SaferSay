/**
 * Loading placeholders matching the admin token system -- replaces plain
 * "Loading..." text with a shape that previews the content about to
 * arrive.
 */
export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[var(--radius-input)] bg-[var(--bg-active)] motion-reduce:animate-none ${className}`} />;
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
    <div className={`card ${className}`}>
      <SkeletonBlock className="h-4 w-1/3" />
      <div className="mt-4">
        <SkeletonText lines={2} />
      </div>
    </div>
  );
}

export function SkeletonRow({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 border-b border-[var(--border)] p-3 last:border-b-0 ${className}`}>
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
    <p className="mt-4 flex items-center gap-2 secondary-text font-medium">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--ink)] motion-reduce:animate-none" />
      {label}...
    </p>
  );
}

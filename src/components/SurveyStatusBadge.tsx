/** Cycle status values from responses.survey_cycles (db/migrations/0001). */
export type SurveyStatus = "draft" | "scheduled" | "open" | "closed";

const statusConfig: Record<SurveyStatus, { label: string; classes: string; pulse?: boolean }> = {
  draft: { label: "Draft", classes: "bg-[var(--brand-line-soft)] text-[var(--brand-muted)]" },
  scheduled: { label: "Scheduled", classes: "bg-[var(--brand-amber-soft)] text-[var(--brand-amber)]" },
  open: { label: "Live", classes: "bg-[var(--brand-accent-soft)] text-[var(--brand-accent)]", pulse: true },
  closed: { label: "Closed", classes: "bg-[var(--brand-border)] text-[var(--brand-muted)]" },
};

export function SurveyStatusBadge({ status, className = "" }: { status: string; className?: string }) {
  const config = statusConfig[status as SurveyStatus] ?? { label: status, classes: "bg-[var(--brand-line-soft)] text-[var(--brand-muted)]" };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 py-1 text-xs font-semibold ${config.classes} ${className}`}
    >
      {config.pulse ? (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brand-accent)] opacity-75 motion-reduce:animate-none" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--brand-accent)]" />
        </span>
      ) : null}
      {config.label}
    </span>
  );
}

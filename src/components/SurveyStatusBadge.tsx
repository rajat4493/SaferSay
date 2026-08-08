/** Cycle status values from responses.survey_cycles (db/migrations/0001). */
export type SurveyStatus = "draft" | "scheduled" | "open" | "closed";

const neutralLabels: Record<Exclude<SurveyStatus, "open">, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  closed: "Closed",
};

/**
 * Green is reserved for the live survey state only (design directive:
 * "Live status tag: Green only... Used only for live survey state").
 * Every other status is a plain neutral pill -- no amber, no other
 * colour in admin chrome.
 */
export function SurveyStatusBadge({ status, className = "" }: { status: string; className?: string }) {
  if (status === "open") {
    return (
      <span className={`live-tag ${className}`}>
        <span className="live-dot" />
        Live
      </span>
    );
  }

  const label = neutralLabels[status as Exclude<SurveyStatus, "open">] ?? status;
  return (
    <span className={`inline-flex items-center rounded-[var(--radius-pill)] bg-[var(--bg-active)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-mid)] ${className}`}>
      {label}
    </span>
  );
}

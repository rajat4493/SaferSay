import Link from "next/link";
import { SurveyStatusBadge } from "@/components/SurveyStatusBadge";

const stages = ["Build", "Send", "Results"] as const;

const stagePath: Record<(typeof stages)[number], (surveyId: string) => string> = {
  Build: (surveyId) => `/app/${surveyId}`,
  Send: (surveyId) => `/app/${surveyId}/send`,
  Results: (surveyId) => `/app/${surveyId}/results`,
};

/**
 * `surveyId` is optional so this still renders (as plain, unlinked labels)
 * from any caller that hasn't been updated to pass it -- but every current
 * caller has the id on hand and should pass it. Before this, opening an
 * already-live survey always landed on Build with no way to jump directly
 * to Send/Results short of manually editing the URL -- confirmed as a real
 * gap by an HR persona review, not just a nice-to-have.
 */
export function SurveyStageTabs({ active, status, surveyId }: { active: (typeof stages)[number]; status?: string; surveyId?: string }) {
  const activeIndex = stages.indexOf(active);
  return (
    <div className="flex flex-wrap items-center gap-4 text-[13px]">
      <span className="meta-label">
        Stage {activeIndex + 1} of {stages.length}
      </span>
      {status ? <SurveyStatusBadge status={status} /> : null}
      <div className="flex items-center gap-1.5">
        {stages.map((stage, index) => {
          // "Send" reads as closed rather than active once the survey is
          // closed -- it's still a reachable page (it explains why sending
          // stopped), just not one that should visually invite the next
          // action the way an in-progress stage does.
          const isClosedSend = stage === "Send" && status === "closed";
          const className = isClosedSend
            ? "text-[var(--ink-faint)] line-through decoration-1"
            : stage === active
              ? "font-medium text-[var(--ink)]"
              : "text-[var(--ink-faint)] hover:text-[var(--ink-mid)] hover:underline";
          return (
            <span key={stage} className="flex items-center gap-1.5">
              {index > 0 ? <span className="text-[var(--ink-faint)]">/</span> : null}
              {surveyId && stage !== active ? (
                <Link href={stagePath[stage](surveyId)} className={className}>
                  {stage}
                </Link>
              ) : (
                <span className={className}>{stage}</span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

import { SurveyStatusBadge } from "@/components/SurveyStatusBadge";

const stages = ["Build", "Send", "Results"] as const;

export function SurveyStageTabs({ active, status }: { active: (typeof stages)[number]; status?: string }) {
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
          return (
            <span key={stage} className="flex items-center gap-1.5">
              {index > 0 ? <span className="text-[var(--ink-faint)]">/</span> : null}
              <span
                className={
                  isClosedSend
                    ? "text-[var(--ink-faint)] line-through decoration-1"
                    : stage === active
                      ? "font-medium text-[var(--ink)]"
                      : "text-[var(--ink-faint)]"
                }
              >
                {stage}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

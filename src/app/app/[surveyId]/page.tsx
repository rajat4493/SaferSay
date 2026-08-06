"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowRight, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export default function SurveyBuildPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.surveyId as string;

  // TODO: Fetch survey data from /api/cycles/[id]
  // const [survey, setSurvey] = useState<SurveyDetail | null>(null);
  // useEffect(() => {
  //   fetch(`/api/cycles/${surveyId}`)
  //     .then(r => r.json())
  //     .then(data => setSurvey(data.cycle));
  // }, [surveyId]);

  return (
    <AppShell
      title="Build: Questions"
      subtitle="Choose your template and customize questions for this survey."
    >
      <div className="space-y-6">
        {/* Stage indicator */}
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--brand-accent-soft)] px-3 py-1 font-semibold text-[var(--brand-accent)]">
            Stage 1 of 3
          </div>
          <ChevronRight size={16} className="text-[var(--brand-muted)]" />
          <span className="text-[var(--brand-muted)]">Build</span>
          <ChevronRight size={16} className="text-[var(--brand-muted)]" />
          <span className="text-[var(--brand-muted)]">Send</span>
          <ChevronRight size={16} className="text-[var(--brand-muted)]" />
          <span className="text-[var(--brand-muted)]">Results</span>
        </div>

        {/* Build stage content */}
        <div className="rounded-[var(--radius-card)] border border-[var(--brand-glass-border)] bg-[var(--brand-glass-strong)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-xl">
          <h2 className="text-lg font-semibold">Choose a template</h2>
          <p className="mt-2 text-sm text-[var(--brand-muted)]">
            Pick a pre-built question set or start from scratch.
          </p>

          <div className="mt-6 space-y-3">
            {/* Template list placeholder */}
            <p className="text-sm text-[var(--brand-muted)]">
              Loading templates...
            </p>
            {/* TODO: Map through templates and show options
                Templates should include:
                - Engagement
                - Psychological Safety
                - Manager Effectiveness
                - Retention Risk
                - Custom (blank)
            */}
          </div>
        </div>

        <div className="rounded-[var(--radius-card)] border border-[var(--brand-glass-border)] bg-[var(--brand-glass-strong)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-xl">
          <h2 className="text-lg font-semibold">Customize questions</h2>
          <p className="mt-2 text-sm text-[var(--brand-muted)]">
            Edit or add questions specific to your needs.
          </p>
          {/* TODO: Question editor
              - Show current template questions
              - Allow edit/delete
              - Allow add new question
              - Validate k-anonymity constraints
          */}
        </div>

        {/* Next button */}
        <div className="flex justify-end">
          <button
            onClick={() => router.push(`/app/${surveyId}/send`)}
            className="inline-flex items-center gap-2 rounded-[var(--radius-button)] bg-[var(--brand-accent)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-accent-deep)]"
          >
            Next: Send survey
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </AppShell>
  );
}

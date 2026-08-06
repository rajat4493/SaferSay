"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Download } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ConfidentialitySeal } from "@/components/ConfidentialitySeal";

export default function SurveyResultsPage() {
  const router = useRouter();

  // TODO: Fetch survey data and results using the surveyId route param
  // const params = useParams();
  // const surveyId = params.surveyId as string;
  // const [survey, setSurvey] = useState<SurveyDetail | null>(null);
  // const [report, setReport] = useState<ProtectedReport | null>(null);
  // useEffect(() => {
  //   Promise.all([
  //     fetch(`/api/cycles/${surveyId}`).then(r => r.json()),
  //     fetch(`/api/cycles/${surveyId}/report`).then(r => r.json())
  //   ]).then(([cycleData, reportData]) => {
  //     setSurvey(cycleData.cycle);
  //     setReport(reportData.report);
  //   });
  // }, [surveyId]);

  return (
    <AppShell
      title="Results: Safe Report"
      subtitle="Aggregate, k-anonymity-protected insights from your survey responses."
    >
      <div className="space-y-6">
        {/* Stage indicator */}
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--brand-accent-soft)] px-3 py-1 font-semibold text-[var(--brand-accent)]">
            Stage 3 of 3
          </div>
          <ChevronRight size={16} className="text-[var(--brand-muted)]" />
          <span className="text-[var(--brand-muted)]">Build</span>
          <ChevronRight size={16} className="text-[var(--brand-muted)]" />
          <span className="text-[var(--brand-muted)]">Send</span>
          <ChevronRight size={16} className="text-[var(--brand-muted)]" />
          <span className="text-[var(--brand-accent)] font-semibold">Results</span>
        </div>

        {/* Confidentiality seal */}
        <ConfidentialitySeal />

        {/* Response status */}
        <div className="rounded-[var(--radius-card)] border border-[var(--brand-glass-border)] bg-[var(--brand-glass-strong)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-xl">
          <h2 className="text-lg font-semibold">Response status</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <div className="text-3xl font-semibold">0</div>
              <div className="mt-1 text-sm text-[var(--brand-muted)]">Sent</div>
            </div>
            <div>
              <div className="text-3xl font-semibold">0</div>
              <div className="mt-1 text-sm text-[var(--brand-muted)]">Responded</div>
            </div>
            <div>
              <div className="text-3xl font-semibold">—</div>
              <div className="mt-1 text-sm text-[var(--brand-muted)]">Completion rate</div>
            </div>
          </div>
          {/* TODO: Load from /api/cycles/[surveyId] (participation summary) */}
        </div>

        {/* Report (protected) */}
        <div className="rounded-[var(--radius-card)] border border-[var(--brand-glass-border)] bg-[var(--brand-glass-strong)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Results breakdown</h2>
              <p className="mt-2 text-sm text-[var(--brand-muted)]">
                Only k-safe aggregate data is shown — no individual responses.
              </p>
            </div>
            <button className="inline-flex items-center gap-2 rounded-[var(--radius-button)] border border-[var(--brand-line)] px-4 py-2 text-sm font-semibold transition hover:bg-[var(--brand-line-soft)]">
              <Download size={16} />
              Export PDF
            </button>
          </div>

          {/* TODO: Load report from /api/cycles/[surveyId]/report
              If report.protected === true:
              - Show: "Results not yet available (need N more responses to reach k-threshold)"
              If report.protected === false:
              - Show question breakdown with n, average, response distribution
              - Never show individual responses
          */}
          <div className="mt-6 text-sm text-[var(--brand-muted)]">
            Waiting for responses... Report will appear once the k-anonymity threshold is met.
          </div>
        </div>

        {/* Manage survey */}
        <div className="rounded-[var(--radius-card)] border border-[var(--brand-glass-border)] bg-[var(--brand-glass-strong)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-xl">
          <h2 className="text-lg font-semibold">Manage survey</h2>
          <div className="mt-4 space-y-3">
            <button className="w-full rounded-[var(--radius-button)] border border-[var(--brand-line)] px-4 py-2 text-left text-sm font-medium transition hover:bg-[var(--brand-line-soft)]">
              Send reminders to non-respondents
            </button>
            <button className="w-full rounded-[var(--radius-button)] border border-[var(--brand-line)] px-4 py-2 text-left text-sm font-medium transition hover:bg-[var(--brand-line-soft)]">
              Close survey & lock responses
            </button>
            <button className="w-full rounded-[var(--radius-button)] border border-[var(--brand-line)] px-4 py-2 text-left text-sm font-medium transition hover:bg-[var(--brand-line-soft)]">
              Archive survey
            </button>
          </div>
          {/* TODO: Wire up close/archive actions
              - POST /api/cycles/[surveyId]/close
              - POST /api/cycles/[surveyId]/archive
              - Emit audit logs for each action
          */}
        </div>

        {/* Back button */}
        <div className="flex justify-start">
          <button
            onClick={() => router.push("/app")}
            className="inline-flex items-center gap-2 rounded-[var(--radius-button)] border border-[var(--brand-line)] px-5 py-2 text-sm font-semibold text-[var(--brand-ink)] transition hover:bg-[var(--brand-line-soft)]"
          >
            <ArrowLeft size={16} />
            Back to surveys
          </button>
        </div>
      </div>
    </AppShell>
  );
}

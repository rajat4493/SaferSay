"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export default function SurveySendPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.surveyId as string;

  // TODO: Fetch survey data and invitation status
  // const [survey, setSurvey] = useState<SurveyDetail | null>(null);
  // const [inviteStatus, setInviteStatus] = useState<InviteOutboxSummary | null>(null);
  // useEffect(() => {
  //   Promise.all([
  //     fetch(`/api/cycles/${surveyId}`).then(r => r.json()),
  //     fetch(`/api/cycles/${surveyId}/invites`).then(r => r.json())
  //   ]).then(([cycleData, inviteData]) => {
  //     setSurvey(cycleData.cycle);
  //     setInviteStatus(inviteData.summary);
  //   });
  // }, [surveyId]);

  return (
    <AppShell
      title="Send: Invitations"
      subtitle="Queue and send confidential survey invite links to your employees."
    >
      <div className="space-y-6">
        {/* Stage indicator */}
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--brand-accent-soft)] px-3 py-1 font-semibold text-[var(--brand-accent)]">
            Stage 2 of 3
          </div>
          <ChevronRight size={16} className="text-[var(--brand-muted)]" />
          <span className="text-[var(--brand-muted)]">Build</span>
          <ChevronRight size={16} className="text-[var(--brand-muted)]" />
          <span className="text-[var(--brand-accent)] font-semibold">Send</span>
          <ChevronRight size={16} className="text-[var(--brand-muted)]" />
          <span className="text-[var(--brand-muted)]">Results</span>
        </div>

        {/* Invitation status */}
        <div className="rounded-[var(--radius-card)] border border-[var(--brand-glass-border)] bg-[var(--brand-glass-strong)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-xl">
          <h2 className="text-lg font-semibold">Invitation status</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <div className="text-3xl font-semibold">0</div>
              <div className="mt-1 text-sm text-[var(--brand-muted)]">Pending</div>
            </div>
            <div>
              <div className="text-3xl font-semibold">0</div>
              <div className="mt-1 text-sm text-[var(--brand-muted)]">Queued to send</div>
            </div>
            <div>
              <div className="text-3xl font-semibold">0</div>
              <div className="mt-1 text-sm text-[var(--brand-muted)]">Sent</div>
            </div>
          </div>
          {/* TODO: Load from /api/cycles/[surveyId]/invites (summary) */}
        </div>

        {/* Queue invitations */}
        <div className="rounded-[var(--radius-card)] border border-[var(--brand-glass-border)] bg-[var(--brand-glass-strong)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-xl">
          <h2 className="text-lg font-semibold">Queue invitations</h2>
          <p className="mt-2 text-sm text-[var(--brand-muted)]">
            Select employees from your directory who should receive this survey.
          </p>
          {/* TODO: Show employee list with checkboxes
              - Fetch active employees from /api/participants
              - Allow select all
              - Show count of selected
              - Button to "Queue invitations"
          */}
          <p className="mt-4 text-sm text-[var(--brand-muted)]">
            Loading employee directory...
          </p>
        </div>

        {/* Send immediately or schedule */}
        <div className="rounded-[var(--radius-card)] border border-[var(--brand-glass-border)] bg-[var(--brand-glass-strong)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-xl">
          <h2 className="text-lg font-semibold">Send invitations</h2>
          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-3">
              <input type="radio" name="send-timing" defaultChecked className="h-4 w-4" />
              <span className="text-sm">Send now to all queued invitations</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="radio" name="send-timing" className="h-4 w-4" />
              <span className="text-sm">Schedule for later</span>
            </label>
          </div>
          {/* TODO: Schedule picker if "later" selected */}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={() => router.push(`/app/${surveyId}`)}
            className="inline-flex items-center gap-2 rounded-[var(--radius-button)] border border-[var(--brand-line)] px-5 py-2 text-sm font-semibold text-[var(--brand-ink)] transition hover:bg-[var(--brand-line-soft)]"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <button
            onClick={() => router.push(`/app/${surveyId}/results`)}
            className="inline-flex items-center gap-2 rounded-[var(--radius-button)] bg-[var(--brand-accent)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-accent-deep)]"
          >
            Next: View results
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </AppShell>
  );
}

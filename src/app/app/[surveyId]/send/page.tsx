"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { InviteOutboxPanel } from "@/components/InviteOutboxPanel";

export default function SurveySendPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.surveyId as string;

  return (
    <AppShell
      title="Send"
      subtitle="Prepare, queue, and send confidential invite links to your employees."
    >
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--brand-accent-soft)] px-3 py-1 font-semibold text-[var(--brand-accent)]">
            Stage 2 of 3
          </div>
          <ChevronRight size={16} className="text-[var(--brand-muted)]" />
          <span className="text-[var(--brand-muted)]">Build</span>
          <ChevronRight size={16} className="text-[var(--brand-muted)]" />
          <span className="font-semibold text-[var(--brand-accent)]">Send</span>
          <ChevronRight size={16} className="text-[var(--brand-muted)]" />
          <span className="text-[var(--brand-muted)]">Results</span>
        </div>

        <InviteOutboxPanel cycleId={surveyId} />

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

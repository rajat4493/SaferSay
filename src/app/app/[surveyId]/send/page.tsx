"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { InviteOutboxPanel } from "@/components/InviteOutboxPanel";
import { SurveyStageTabs } from "@/components/SurveyStageTabs";

export default function SurveySendPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.surveyId as string;

  return (
    <AppShell title="Send" subtitle="Prepare, queue, and send confidential invite links to your employees.">
      <div className="space-y-[9px]">
        <SurveyStageTabs active="Send" />

        <InviteOutboxPanel cycleId={surveyId} />

        <div className="flex justify-between">
          <button onClick={() => router.push(`/app/${surveyId}`)} className="btn-secondary">
            <ArrowLeft size={14} strokeWidth={1.8} />
            Back
          </button>
          <button onClick={() => router.push(`/app/${surveyId}/results`)} className="btn-primary">
            Next: View results
            <ArrowRight size={14} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </AppShell>
  );
}

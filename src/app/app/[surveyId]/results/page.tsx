"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Lock, Send } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProtectedReportPanel } from "@/components/ProtectedReportPanel";
import { SurveyStatusBadge } from "@/components/SurveyStatusBadge";
import { useToast } from "@/components/ToastProvider";

export default function SurveyResultsPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const surveyId = params.surveyId as string;
  const [status, setStatus] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);

  useEffect(() => {
    fetch(`/api/cycles/${surveyId}`)
      .then((response) => response.json())
      .then((data: { ok?: boolean; cycle?: { status: string } }) => {
        if (data.ok && data.cycle) setStatus(data.cycle.status);
      })
      .catch(() => undefined);
  }, [surveyId]);

  async function sendReminders() {
    setSendingReminders(true);
    try {
      await fetch("/api/invites/outbox", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cycleId: surveyId, includeReminders: true }),
      });
      const response = await fetch("/api/invites/queue", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cycleId: surveyId, deliveryType: "reminder", sendNow: true }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        delivery?: { sent: number; failed: number };
        error?: string;
      };
      if (data.error) {
        toast.show({ variant: "error", message: data.error });
      } else if (data.delivery) {
        toast.show({
          variant: data.delivery.failed === 0 ? "success" : "error",
          message: `${data.delivery.sent} reminder${data.delivery.sent === 1 ? "" : "s"} sent, ${data.delivery.failed} failed.`,
        });
      } else {
        toast.show({ variant: "info", message: "No pending reminders to send -- everyone has either responded or already been reminded." });
      }
    } catch {
      toast.show({ variant: "error", message: "Couldn't send reminders. Try again." });
    } finally {
      setSendingReminders(false);
    }
  }

  async function closeSurvey() {
    if (status === "closed") return;
    if (!window.confirm("Close this survey and lock responses? No one will be able to submit after this.")) return;

    setClosing(true);
    try {
      const response = await fetch(`/api/cycles/${surveyId}/close`, { method: "POST" });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (data.ok) {
        setStatus("closed");
        toast.show({ variant: "success", message: "Survey closed. Responses are locked." });
      } else {
        toast.show({ variant: "error", message: data.error ?? "Couldn't close the survey." });
      }
    } catch {
      toast.show({ variant: "error", message: "Couldn't close the survey. Try again." });
    } finally {
      setClosing(false);
    }
  }

  return (
    <AppShell
      title="Results"
      subtitle="Aggregate, k-anonymity-protected insights from your survey responses."
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <div className="flex items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--brand-accent-soft)] px-3 py-1 font-semibold text-[var(--brand-accent)]">
            Stage 3 of 3
          </div>
          {status ? <SurveyStatusBadge status={status} /> : null}
          <ChevronRight size={16} className="text-[var(--brand-muted)]" />
          <span className="text-[var(--brand-muted)]">Build</span>
          <ChevronRight size={16} className="text-[var(--brand-muted)]" />
          <span className="text-[var(--brand-muted)]">Send</span>
          <ChevronRight size={16} className="text-[var(--brand-muted)]" />
          <span className="font-semibold text-[var(--brand-accent)]">Results</span>
        </div>

        <ProtectedReportPanel cycleId={surveyId} />

        <div className="rounded-[var(--radius-card)] border border-[var(--brand-glass-border)] bg-[var(--brand-glass-strong)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-xl">
          <h2 className="text-lg font-semibold">Manage survey</h2>
          <div className="mt-4 space-y-3">
            <button
              onClick={sendReminders}
              disabled={sendingReminders || status === "closed"}
              className="flex w-full items-center gap-2 rounded-[var(--radius-button)] border border-[var(--brand-line)] px-4 py-2 text-left text-sm font-medium transition hover:bg-[var(--brand-line-soft)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={15} />
              {sendingReminders ? "Sending..." : "Send reminders to non-respondents"}
            </button>
            <button
              onClick={closeSurvey}
              disabled={closing || status === "closed"}
              className="flex w-full items-center gap-2 rounded-[var(--radius-button)] border border-[var(--brand-line)] px-4 py-2 text-left text-sm font-medium transition hover:bg-[var(--brand-amber-soft)] hover:text-[var(--brand-amber)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Lock size={15} />
              {status === "closed" ? "Survey closed" : closing ? "Closing..." : "Close survey & lock responses"}
            </button>
          </div>
        </div>

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

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Lock, Send } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProtectedReportPanel } from "@/components/ProtectedReportPanel";
import { SurveyStageTabs } from "@/components/SurveyStageTabs";
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
    <AppShell title="Results" subtitle="Sealed — scores only, sources never">
      <div className="space-y-[9px]">
        <SurveyStageTabs active="Results" status={status ?? undefined} />

        <ProtectedReportPanel cycleId={surveyId} />

        <div className="card">
          <h2 className="section-title">Manage survey</h2>
          <div className="mt-4 space-y-2">
            <button onClick={sendReminders} disabled={sendingReminders || status === "closed"} className="btn-secondary w-full justify-start">
              <Send size={14} strokeWidth={1.8} />
              {sendingReminders ? "Sending..." : "Send reminders to non-respondents"}
            </button>
            <button onClick={closeSurvey} disabled={closing || status === "closed"} className="btn-destructive w-full justify-start">
              <Lock size={14} strokeWidth={1.8} />
              {status === "closed" ? "Survey closed" : closing ? "Closing..." : "Close survey & lock responses"}
            </button>
          </div>
        </div>

        <div className="flex justify-start">
          <button onClick={() => router.push("/app")} className="btn-secondary">
            <ArrowLeft size={14} strokeWidth={1.8} />
            Back to surveys
          </button>
        </div>
      </div>
    </AppShell>
  );
}

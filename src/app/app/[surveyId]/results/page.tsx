"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, CheckCircle2, FileEdit, Lock, Send } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CycleTrendPanel } from "@/components/CycleTrendPanel";
import { ProtectedReportPanel } from "@/components/ProtectedReportPanel";
import { SurveyStageTabs } from "@/components/SurveyStageTabs";
import { useToast } from "@/components/ToastProvider";
import { canRunSurvey } from "@/lib/permissions";
import { titleCaseTeam } from "@/lib/textFormat";
import type { UserRole } from "@/lib/server/repositories/types";

type CycleSummary = { id: string; name: string };

// Three states a survey's results page can be in -- the page framing
// (banner + which actions are shown) follows this, not just the raw
// cycle status, so "closed with results ready" and "open but still
// collecting" don't look like the same screen.
type ResultsState = "collecting" | "ready" | "closed";

export default function SurveyResultsPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const surveyId = params.surveyId as string;
  const [status, setStatus] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [cycles, setCycles] = useState<CycleSummary[]>([]);
  const [protectedReport, setProtectedReport] = useState<boolean | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  // Read-only roles (auditor) can view this page but must never see the
  // mutating controls below -- the APIs those controls call already 403 an
  // auditor, but the buttons shouldn't render for them in the first place.
  const [canManage, setCanManage] = useState(false);
  // Reset the department picker to "All teams" when the cycle changes,
  // without setState-in-effect -- adjusting state during render in
  // response to a changed prop is the pattern React recommends for this.
  const [departmentResetKey, setDepartmentResetKey] = useState(surveyId);
  if (surveyId !== departmentResetKey) {
    setDepartmentResetKey(surveyId);
    setSelectedDepartment("");
  }

  useEffect(() => {
    fetch(`/api/cycles/${surveyId}`)
      .then((response) => response.json())
      .then((data: { ok?: boolean; cycle?: { status: string } }) => {
        if (data.ok && data.cycle) setStatus(data.cycle.status);
      })
      .catch(() => undefined);
  }, [surveyId]);

  useEffect(() => {
    fetch(`/api/report?cycleId=${encodeURIComponent(surveyId)}`)
      .then((response) => response.json())
      .then((data: { ok?: boolean; report?: { protected: boolean } }) => {
        if (data.ok && data.report) setProtectedReport(data.report.protected);
      })
      .catch(() => undefined);
  }, [surveyId]);

  const resultsState: ResultsState | null =
    status === null || protectedReport === null ? null : status === "closed" ? "closed" : protectedReport ? "collecting" : "ready";

  useEffect(() => {
    fetch("/api/cycles")
      .then((response) => response.json())
      .then((data: { ok?: boolean; cycles?: CycleSummary[] }) => {
        if (data.ok) setCycles(data.cycles ?? []);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    fetch("/api/tenants/current")
      .then((response) => response.json())
      .then((data: { ok?: boolean; role?: UserRole }) => {
        if (data.ok) setCanManage(canRunSurvey(data.role as UserRole));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    fetch(`/api/report/departments?cycleId=${encodeURIComponent(surveyId)}`)
      .then((response) => response.json())
      .then((data: { ok?: boolean; departments?: string[] }) => {
        if (data.ok) setDepartments(data.departments ?? []);
      })
      .catch(() => undefined);
  }, [surveyId]);

  async function sendReminders() {
    setSendingReminders(true);
    try {
      const response = await fetch("/api/invites/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cycleId: surveyId, deliveryType: "reminder" }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        delivery?: { sent: number; failed: number; errors?: string[] };
        error?: string;
      };
      if (data.error) {
        toast.show({ variant: "error", message: data.error });
      } else if (data.delivery && data.delivery.sent === 0 && data.delivery.failed === 0) {
        toast.show({ variant: "info", message: "Nobody is eligible for a reminder right now — everyone has either responded or was already reminded." });
      } else if (data.delivery) {
        const detail = data.delivery.failed > 0 && data.delivery.errors?.[0] ? ` (${data.delivery.errors[0]})` : "";
        toast.show({
          variant: data.delivery.failed === 0 ? "success" : "error",
          message: `${data.delivery.sent} reminder${data.delivery.sent === 1 ? "" : "s"} sent, ${data.delivery.failed} failed${detail}.`,
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
      title="Team Pulse"
      subtitle="Real feedback. Protected by design."
      headerActions={
        <>
          <select
            value={surveyId}
            onChange={(event) => router.push(`/app/${event.target.value}/results`)}
            className="pill-select"
          >
            {cycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.name}
              </option>
            ))}
          </select>
          <select
            value={selectedDepartment}
            onChange={(event) => setSelectedDepartment(event.target.value)}
            className="pill-select"
            title="Team-level results still respect the anonymity threshold -- some views may not be available yet."
          >
            <option value="">All teams</option>
            {departments.map((department) => (
              <option key={department} value={department}>
                {titleCaseTeam(department)}
              </option>
            ))}
          </select>
          <span className="icon-btn" aria-hidden="true">
            <Calendar size={15} strokeWidth={1.8} />
          </span>
        </>
      }
    >
      <div className="space-y-[9px]">
        <SurveyStageTabs active="Results" status={status ?? undefined} />

        {resultsState ? <ResultsStateBanner state={resultsState} protectedReport={protectedReport} /> : null}

        <ProtectedReportPanel cycleId={surveyId} department={selectedDepartment || undefined} />

        {cycles.length > 1 ? <CycleTrendPanel /> : null}

        {resultsState === "closed" ? (
          <div className="card">
            <h2 className="section-title">This survey is closed</h2>
            <p className="mt-2 secondary-text">
              {protectedReport
                ? "Responses are locked, and results stay protected because the anonymity threshold was never reached."
                : "Responses are locked. Close the loop with your team, then start your next survey when you're ready."}
            </p>
            <div className="mt-4 space-y-2">
              {canManage ? (
                <button
                  onClick={() => router.push(`/app/${surveyId}/actions/update`)}
                  disabled={protectedReport === true}
                  className="btn-secondary w-full justify-start disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FileEdit size={14} strokeWidth={1.8} />
                  {protectedReport ? "Team update unavailable — results never unlocked" : "Draft an update to the team"}
                </button>
              ) : null}
              {canManage ? (
                <button onClick={() => router.push("/app/surveys/new")} className="btn-primary w-full justify-start">
                  Start your next survey
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          canManage ? (
            <div className="card">
              <h2 className="section-title">Manage survey</h2>
              <div className="mt-4 space-y-2">
                <button
                  onClick={() => router.push(`/app/${surveyId}/actions/update`)}
                  disabled={resultsState === "collecting"}
                  title={resultsState === "collecting" ? "Team update becomes available once results unlock." : undefined}
                  className="btn-secondary w-full justify-start disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FileEdit size={14} strokeWidth={1.8} />
                  {resultsState === "collecting" ? "Team update becomes available once results unlock" : "Draft an update to the team"}
                </button>
                <button onClick={sendReminders} disabled={sendingReminders} className="btn-secondary w-full justify-start">
                  <Send size={14} strokeWidth={1.8} />
                  {sendingReminders ? "Sending..." : "Send reminders to non-respondents"}
                </button>
                <button onClick={closeSurvey} disabled={closing} className="btn-destructive w-full justify-start">
                  <Lock size={14} strokeWidth={1.8} />
                  {closing ? "Closing..." : "Close survey & lock responses"}
                </button>
              </div>
            </div>
          ) : null
        )}

        <div className="flex justify-start">
          <button onClick={() => router.push("/app/surveys")} className="btn-secondary">
            <ArrowLeft size={14} strokeWidth={1.8} />
            Back to surveys
          </button>
        </div>
      </div>
    </AppShell>
  );
}

// This banner is meant to be the dominant, unambiguous read on the page --
// the state score/AI cards below are supporting detail, not competing
// headlines, so this gets a colored accent and more weight than a plain
// .card would give it.
function ResultsStateBanner({ state, protectedReport }: { state: ResultsState; protectedReport: boolean | null }) {
  const { title, body, icon: Icon, accent } =
    state === "collecting"
      ? {
          title: "Collecting responses",
          body: "Results stay hidden until enough people have responded to keep individuals unidentifiable.",
          icon: Send,
          accent: "var(--ink-mid)",
        }
      : state === "ready"
        ? {
            title: "Results ready",
            body: "Enough responses are in. The aggregate report below is unlocked.",
            icon: CheckCircle2,
            accent: "var(--green)",
          }
        : protectedReport
          ? {
              title: "Closed — results stayed protected",
              body: "This survey is locked, and the anonymity threshold was never reached, so results remain hidden.",
              icon: Lock,
              accent: "var(--ink-mid)",
            }
          : {
              title: "Closed — results available",
              body: "This survey is locked. No further responses can be submitted, and results are available below.",
              icon: Lock,
              accent: "var(--green)",
            };
  return (
    <div className="card flex items-start gap-3 py-4" style={{ borderLeft: `3px solid ${accent}` }}>
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--bg-active)]" style={{ color: accent }}>
        <Icon size={15} strokeWidth={1.8} />
      </span>
      <div>
        <p className="text-[14.5px] font-semibold text-[var(--ink)]">{title}</p>
        <p className="mt-0.5 text-[12.5px] leading-[1.5] text-[var(--ink-soft)]">{body}</p>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Calendar, CheckCircle2, FileEdit, Flag, Lock, Send, ThumbsUp } from "lucide-react";
import { AppShell, Card } from "@/components/AppShell";
import { CycleTrendPanel } from "@/components/CycleTrendPanel";
import { IconBadge } from "@/components/IconBadge";
import { ProtectedReportPanel } from "@/components/ProtectedReportPanel";
import { RingStat } from "@/components/RingStat";
import { ThemeReportCard } from "@/components/ThemeReportCard";
import { SurveyStageTabs } from "@/components/SurveyStageTabs";
import { useToast } from "@/components/ToastProvider";
import { canExportReports, canRunSurvey, canViewComments, canViewCrossCycleTrend } from "@/lib/permissions";
import { getScoreTier } from "@/lib/scoreTier";
import { titleCaseTeam } from "@/lib/textFormat";
import type { UserRole } from "@/lib/server/repositories/types";

type CycleSummary = { id: string; name: string };
type ReportRow = { questionId: string; label?: string; n: number; average: number | null; scaleMax?: 5 | 10 };
type ScopedReport = { report?: { protected: boolean; n: number; rows: ReportRow[] }; eligibleCount?: number };

// Three states a survey's results page can be in -- the page framing
// (banner + which actions are shown) follows this, not just the raw
// cycle status, so "closed with results ready" and "open but still
// collecting" don't look like the same screen.
type ResultsState = "collecting" | "ready" | "closed";

export default function SurveyResultsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const surveyId = params.surveyId as string;
  // From the Overview heatmap's "click a tile to explore" links -- opens
  // that theme pre-expanded instead of landing on a collapsed list.
  const themeParam = searchParams.get("theme") ?? undefined;
  const [status, setStatus] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [cycles, setCycles] = useState<CycleSummary[]>([]);
  const [protectedReport, setProtectedReport] = useState<boolean | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [notFound, setNotFound] = useState(false);
  // Feeds the Response rate ring and Top strengths/priorities lists --
  // scoped by department alongside ProtectedReportPanel's own separate
  // fetch of the same endpoint, since those two cards need row-level data
  // this page didn't previously fetch for itself.
  const [scopedReport, setScopedReport] = useState<ScopedReport | null>(null);
  const [employeeCount, setEmployeeCount] = useState<number | null>(null);
  const [scopedEligibleCount, setScopedEligibleCount] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  // Read-only roles (auditor) can view this page but must never see the
  // mutating controls below -- the APIs those controls call already 403 an
  // auditor, but the buttons shouldn't render for them in the first place.
  const [canManage, setCanManage] = useState(false);
  const [role, setRole] = useState<UserRole | null>(null);
  // Reset the department picker to "All teams" when the cycle changes,
  // without setState-in-effect -- adjusting state during render in
  // response to a changed prop is the pattern React recommends for this.
  const [departmentResetKey, setDepartmentResetKey] = useState(surveyId);
  if (surveyId !== departmentResetKey) {
    setDepartmentResetKey(surveyId);
    setSelectedDepartment("");
  }

  // Client-side navigation between two surveys' results pages (e.g. the
  // survey picker in the header) reuses this component without a full
  // reload -- so a still-in-flight fetch for the PREVIOUS surveyId can
  // resolve after the new one and overwrite state with the wrong survey's
  // data if nothing checks "is this response still for the current
  // survey" first. Real bug found in live testing: a fresh survey's
  // results page briefly showed a different, older survey's report.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/cycles/${surveyId}`)
      .then((response) => response.json())
      .then((data: { ok?: boolean; cycle?: { status: string } }) => {
        if (cancelled) return;
        if (!data.ok || !data.cycle) {
          setNotFound(true);
          return;
        }
        setStatus(data.cycle.status);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [surveyId]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/report?cycleId=${encodeURIComponent(surveyId)}`)
      .then((response) => response.json())
      .then((data: { ok?: boolean; notFound?: boolean; report?: { protected: boolean } }) => {
        if (cancelled) return;
        if (data.notFound) {
          setNotFound(true);
          return;
        }
        if (data.ok && data.report) setProtectedReport(data.report.protected);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [surveyId]);

  const resultsState: ResultsState | null =
    status === null || protectedReport === null ? null : status === "closed" ? "closed" : protectedReport ? "collecting" : "ready";

  const scopedRows = scopedReport?.report && !scopedReport.report.protected ? scopedReport.report.rows : [];
  // Normalized to /10 (matches the same pattern in Overview/ThemeReportCard)
  // so a likert_5 question and an enps_0_10 question don't show
  // inconsistent-looking numbers side by side in the same ranking.
  const scoredRows = scopedRows
    .filter((row) => row.average !== null)
    .map((row) => ({ ...row, average10: (row.average! / (row.scaleMax ?? 5)) * 10 }));
  // Same no-distinct-spread threshold as Overview's Top strengths/
  // priorities: forcing a top-3/bottom-3 ranking on near-identical scores
  // fabricates distinctions the data doesn't support.
  const scoreSpread =
    scoredRows.length > 0 ? Math.max(...scoredRows.map((r) => r.average10)) - Math.min(...scoredRows.map((r) => r.average10)) : 0;
  const hasDistinctSpread = scoredRows.length >= 4 && scoreSpread >= 1.0;
  const strengths = hasDistinctSpread ? [...scoredRows].sort((a, b) => b.average10 - a.average10).slice(0, 3) : [];
  const priorities = hasDistinctSpread ? [...scoredRows].sort((a, b) => a.average10 - b.average10).slice(0, 3) : [];

  const responseCount = scopedReport?.report && !scopedReport.report.protected ? scopedReport.report.n : null;
  // A People Leader's scope is resolved server-side and comes back with
  // its own subtree headcount (scopedReport.eligibleCount) -- their
  // report is already scoped to a subtree regardless of the department
  // picker (which they don't have access to), so that figure always
  // takes precedence over the org/department-derived one below.
  const eligibleCount = scopedReport?.eligibleCount ?? (selectedDepartment ? scopedEligibleCount : employeeCount);
  const responseRate = responseCount !== null && eligibleCount ? Math.round((responseCount / eligibleCount) * 100) : null;

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
        if (data.ok) {
          const nextRole = data.role as UserRole;
          setRole(nextRole);
          setCanManage(canRunSurvey(data.role as UserRole));
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/report/departments?cycleId=${encodeURIComponent(surveyId)}`)
      .then((response) => response.json())
      .then((data: { ok?: boolean; departments?: string[] }) => {
        if (!cancelled && data.ok) setDepartments(data.departments ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [surveyId]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ cycleId: surveyId });
    if (selectedDepartment) params.set("department", selectedDepartment);
    fetch(`/api/report?${params.toString()}`)
      .then((response) => response.json())
      .then((data: ScopedReport) => {
        if (!cancelled) setScopedReport(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [surveyId, selectedDepartment]);

  useEffect(() => {
    fetch("/api/employees?limit=1")
      .then((response) => response.json())
      .then((data: { ok?: boolean; total?: number }) => setEmployeeCount(data.ok ? (data.total ?? 0) : null))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!selectedDepartment) {
      startTransition(() => setScopedEligibleCount(null));
      return;
    }
    let cancelled = false;
    fetch(`/api/employees?team=${encodeURIComponent(selectedDepartment)}&limit=1`)
      .then((response) => response.json())
      .then((data: { ok?: boolean; total?: number }) => {
        if (!cancelled) setScopedEligibleCount(data.ok ? (data.total ?? 0) : null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [selectedDepartment]);

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
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; reason?: string };
      if (response.ok && data.ok) {
        setStatus("closed");
        toast.show({ variant: "success", message: "Survey closed. Responses are locked." });
      } else {
        const detail = data.reason ? ` (${data.reason})` : !response.ok ? ` (server error, status ${response.status})` : "";
        toast.show({ variant: "error", message: `${data.error ?? "Couldn't close the survey."}${detail}` });
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
      <div className="space-y-[22px]">
        {notFound ? (
          <div className="card">
            <h2 className="section-title">Survey not found</h2>
            <p className="mt-2 secondary-text">This survey is unavailable in your workspace. Return to Surveys to choose one you can access.</p>
            <button onClick={() => router.push("/app/surveys")} className="btn-secondary mt-4">
              <ArrowLeft size={14} strokeWidth={1.8} />
              Back to surveys
            </button>
          </div>
        ) : (
          <>
        <SurveyStageTabs active="Results" status={status ?? undefined} />

        {resultsState ? <ResultsStateBanner state={resultsState} protectedReport={protectedReport} /> : null}

        {scopedReport?.report && !scopedReport.report.protected ? (
          <div className="grid gap-5 md:grid-cols-3">
            <Card className="flex flex-col items-center justify-center">
              <h2 className="meta-label self-start">Response rate</h2>
              <RingStat
                ratio={responseRate !== null ? responseRate / 100 : 0}
                color="var(--green)"
                centerLabel={responseRate !== null ? `${responseRate}%` : "—"}
                subLabel="responded"
                size={120}
              />
              <p className="secondary-text">{responseCount !== null ? `${responseCount} of ${eligibleCount ?? "?"} eligible` : "No data yet"}</p>
            </Card>

            <Card>
              <h2 className="section-title">Top strengths</h2>
              <ol className="mt-2.5 space-y-2">
                {strengths.map((row) => {
                  const tier = getScoreTier(row.average10);
                  return (
                    <li key={row.questionId} className="flex items-center gap-2.5 text-[13px]">
                      <IconBadge icon={ThumbsUp} tier={tier} />
                      <span className="min-w-0 flex-1 truncate text-[var(--ink)]">{row.label}</span>
                      <span className="font-semibold" style={{ color: tier.text }}>
                        {row.average10.toFixed(1)}
                      </span>
                    </li>
                  );
                })}
                {strengths.length === 0 ? (
                  <li className="secondary-text">
                    {scoredRows.length === 0 ? "No data yet." : "No distinct strengths emerged yet -- scores are close together."}
                  </li>
                ) : null}
              </ol>
            </Card>

            <Card>
              <h2 className="section-title">Top priorities</h2>
              <ol className="mt-2.5 space-y-2">
                {priorities.map((row) => {
                  const tier = getScoreTier(row.average10);
                  return (
                    <li key={row.questionId} className="flex items-center gap-2.5 text-[13px]">
                      <IconBadge icon={Flag} tier={tier} />
                      <span className="min-w-0 flex-1 truncate text-[var(--ink)]">{row.label}</span>
                      <span className="font-semibold" style={{ color: tier.text }}>
                        {row.average10.toFixed(1)}
                      </span>
                    </li>
                  );
                })}
                {priorities.length === 0 ? (
                  <li className="secondary-text">
                    {scoredRows.length === 0 ? "No data yet." : "No distinct priorities emerged yet -- scores are close together."}
                  </li>
                ) : null}
              </ol>
            </Card>
          </div>
        ) : null}

        <ProtectedReportPanel cycleId={surveyId} department={selectedDepartment || undefined} allowExport={role ? canExportReports(role) : false} />

        <ThemeReportCard cycleId={surveyId} department={selectedDepartment || undefined} initialExpandedConstruct={themeParam} />

        {role && canViewComments(role) ? <p className="mt-2 secondary-text">
          <Link href={`/app/${surveyId}/comments`} className="font-medium text-[var(--ink)] underline">
            View comments, filterable by team and theme
          </Link>
        </p> : null}

        {role && canViewCrossCycleTrend(role) && cycles.length > 1 ? <CycleTrendPanel /> : null}

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
          </>
        )}
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
    <div className="card flex items-start gap-3 py-5" style={{ borderLeft: `3px solid ${accent}` }}>
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

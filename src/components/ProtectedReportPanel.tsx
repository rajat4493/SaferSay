"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Download, EyeOff, FileText, RefreshCw, Share2 } from "lucide-react";
import { Card } from "@/components/AppShell";
import { AiSynthesisCard } from "@/components/AiSynthesisCard";
import { ConfidentialitySeal } from "@/components/ConfidentialitySeal";
import { PsychologicalSafetyCard } from "@/components/PsychologicalSafetyCard";
import { SkeletonCard, SkeletonText } from "@/components/Skeleton";
import { useToast } from "@/components/ToastProvider";
import { ViewerCard } from "@/components/ViewerShell";

type CycleAction = { id: string; authorEmail: string; actionText: string; createdAt: string };

type ReportResponse = {
  ok?: boolean;
  error?: string;
  notFound?: boolean;
  cycle?: { id: string; name: string; minGroupSize: number } | null;
  report?: {
    protected: boolean;
    n: number;
    rows: Array<{ questionId: string; label?: string; n: number; average: number | null }>;
  };
  textAnswers?: {
    protected: boolean;
    n: number;
    rows: Array<{ questionId: string; label?: string; n: number; answers: string[] }>;
  };
  enps?: {
    protected: boolean;
    n: number;
    rows: Array<{ questionId: string; label?: string; n: number; promoterPct: number; passivePct: number; detractorPct: number; score: number }>;
  };
};

// Score bars are black by default, red only for scores needing attention
// (design directive: "black for good scores, red for attention scores,
// no green in report bars"). The directive's literal cutoff (<6.5) is
// written for a 0-10 scale; this panel already normalizes every row
// against /5 for the bar width (mixed 1-5 Likert and 0-10 eNPS rows,
// no per-row scale in the API response to normalize precisely), so the
// cutoff is scaled proportionally: 6.5/10 -> 3.25/5.
const ATTENTION_THRESHOLD = 3.25;

export function ProtectedReportPanel({
  mode = "admin",
  cycleId,
  department,
  allowExport = true,
}: {
  mode?: "admin" | "viewer";
  cycleId?: string;
  department?: string;
  allowExport?: boolean;
}) {
  const [result, setResult] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();
  const [actions, setActions] = useState<CycleAction[]>([]);
  const [actionDraft, setActionDraft] = useState("");
  const [savingAction, setSavingAction] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const toast = useToast();
  const ShellCard = mode === "viewer" ? ViewerCard : Card;

  // Guards against a stale response overwriting the current view -- e.g.
  // navigating from one survey's results page to another's via client-side
  // routing (no full reload) leaves the previous survey's /api/report
  // fetch in flight, and without this check whichever response arrives
  // last wins regardless of which cycle it was actually requested for.
  // Real bug found in live testing: a fresh survey's results page briefly
  // rendered a completely different, older survey's report.
  const requestKeyRef = useRef<string>("");

  async function loadReport() {
    const requestKey = `${cycleId ?? ""}|${department ?? ""}`;
    requestKeyRef.current = requestKey;
    setLoading(true);
    const params = new URLSearchParams();
    if (cycleId) params.set("cycleId", cycleId);
    if (department) params.set("department", department);
    const query = params.toString();
    const reportUrl = query ? `/api/report?${query}` : "/api/report";
    const response = await fetch(reportUrl);
    const data = (await response.json().catch(() => ({ ok: false, error: "Report could not be loaded." }))) as ReportResponse;
    if (requestKeyRef.current !== requestKey) return; // a newer request has since superseded this one
    setResult(data);
    setLoading(false);
    if (data.error) toast.show({ variant: "error", message: data.error });
    if (data.cycle?.id) {
      const actionsResponse = await fetch(`/api/report/action?cycleId=${data.cycle.id}`);
      const actionsData = (await actionsResponse.json().catch(() => ({}))) as { ok?: boolean; actions?: CycleAction[] };
      if (requestKeyRef.current === requestKey && actionsData.ok) setActions(actionsData.actions ?? []);
    }
  }

  useEffect(() => {
    startTransition(() => {
      loadReport();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleId, department]);

  const report = result?.report;
  const minGroupSize = result?.cycle?.minGroupSize ?? 5;

  function exportCsv() {
    if (!report || report.protected) return;
    const rows = [["Question", "Responses", "Average"], ...report.rows.map((row) => [row.label ?? row.questionId, String(row.n), row.average?.toFixed(2) ?? ""])];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${result?.cycle?.name ?? "safersay-report"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function exportPdf() {
    if (!report || report.protected) return;
    setDownloadingPdf(true);
    try {
      const params = new URLSearchParams({ format: "pdf" });
      if (result?.cycle?.id) params.set("cycleId", result.cycle.id);
      const response = await fetch(`/api/report/export?${params.toString()}`);
      if (!response.ok) {
        toast.show({ variant: "error", message: "Couldn't generate the PDF. Try again." });
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${result?.cycle?.name ?? "safersay-report"}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.show({ variant: "error", message: "Couldn't generate the PDF. Try again." });
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function submitAction() {
    if (!actionDraft.trim() || !result?.cycle?.id) return;
    setSavingAction(true);
    const response = await fetch("/api/report/action", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cycleId: result.cycle.id, actionText: actionDraft.trim() }),
    });
    const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; actions?: CycleAction[] };
    setSavingAction(false);
    if (data.ok) {
      setActions(data.actions ?? []);
      setActionDraft("");
      toast.show({ variant: "success", message: "Committed. Shared with the team next time you export or share the score." });
    } else {
      toast.show({ variant: "error", message: data.error ?? "Couldn't save that commitment." });
    }
  }

  async function shareScore() {
    if (!report || report.protected) return;
    const lines = [
      `${result?.cycle?.name ?? "Survey"} results (n=${report.n}):`,
      ...report.rows.map((row) => `- ${row.label ?? row.questionId}: ${(row.average ?? 0).toFixed(2)}`),
      actions[0] ? `\nOne change we're committing to: ${actions[0].actionText}` : "",
    ].filter(Boolean);
    await navigator.clipboard.writeText(lines.join("\n"));
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  }

  if (loading && !result) {
    return (
      <>
        <div className="grid gap-3 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <ConfidentialitySeal />
        <div className="card mt-[9px]">
          <SkeletonText lines={4} />
        </div>
      </>
    );
  }

  const scoredRows = report?.rows.filter((row) => row.average !== null) ?? [];
  const overallScore = scoredRows.length ? scoredRows.reduce((sum, row) => sum + (row.average ?? 0), 0) / scoredRows.length : null;

  const textReport = result?.textAnswers;
  // Only show the section at all if there's something to say about it --
  // either it's genuinely protected, or there are real answers. A survey
  // with zero open-text questions returns unprotected+empty, and that
  // shouldn't render an empty "What people said" card.
  const showTextSection = Boolean(textReport && (textReport.protected || textReport.rows.length > 0));

  // eNPS is its own card, not folded into the generic 1-5 bar chart above --
  // %promoters-%detractors is a -100..100 scale, meaningless on the same
  // bar width as a Likert average. Only rendered when there's a real
  // enps_0_10 question with a fully-releasable breakdown (see
  // getProtectedEnpsReport -- a question with any suppressed bucket is
  // simply absent from rows, not shown partially).
  const enpsReport = result?.enps;
  const showEnpsSection = Boolean(enpsReport && !enpsReport.protected && enpsReport.rows.length > 0);

  if (!loading && result?.notFound) {
    return (
      <ShellCard className="mt-[9px]">
        <h2 className="section-title">Survey not found</h2>
        <p className="mt-2 secondary-text">This survey is unavailable in your workspace. Check the link or return to Surveys.</p>
      </ShellCard>
    );
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <PsychologicalSafetyCard
          n={report?.n ?? 0}
          minGroupSize={minGroupSize}
          protectedState={report?.protected ?? true}
          score={overallScore}
          genericUnavailable={Boolean(department) && (!report || report.protected)}
        />
        <AiSynthesisCard cycleId={result?.cycle?.id} locked={!report || report.protected} />
      </div>

      <ConfidentialitySeal />

      <ShellCard className="mt-[9px]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="section-title">{result?.cycle?.name ?? "Latest survey report"}</h2>
            <p className="mt-1 secondary-text">Aggregate report. No participant list, emails, or token state.</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button onClick={loadReport} className="btn-secondary">
              <RefreshCw size={13} strokeWidth={1.8} />
              Refresh
            </button>
            {report && !report.protected && allowExport ? (
              <>
                <button onClick={exportCsv} className="btn-secondary">
                  <Download size={13} strokeWidth={1.8} />
                  Export CSV
                </button>
                <button onClick={exportPdf} disabled={downloadingPdf} className="btn-secondary">
                  <FileText size={13} strokeWidth={1.8} />
                  {downloadingPdf ? "Generating..." : "Export PDF"}
                </button>
                <button onClick={shareScore} className="btn-primary">
                  <Share2 size={13} strokeWidth={1.8} />
                  {shareCopied ? "Copied" : "Share score"}
                </button>
              </>
            ) : null}
          </div>
        </div>

        {loading ? (
          <SkeletonText lines={3} />
        ) : result?.error ? (
          <p className="secondary-text font-medium text-[var(--red)]">{result.error}</p>
        ) : !report || report.protected ? (
          <div>
            <div className="flex items-center gap-2 text-[14px] font-medium text-[var(--ink)]">
              <EyeOff size={16} strokeWidth={1.8} /> {department ? "Not available" : "Results hidden"}
            </div>
            {/* Department-scoped copy is deliberately generic -- it must not
                confirm whether this team is below threshold on its own, or
                suppressed to protect a different team from a differencing
                attack (see responseRepository.ts's getDepartmentReleasability).
                No counts, no "N more needed" framing, same wording every time. */}
            <p className="mt-2 secondary-text">
              {department
                ? "This view isn't available yet."
                : `The report will unlock only after at least ${minGroupSize} submissions exist.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {report.rows.map((row) => {
              const value = row.average ?? 0;
              const width = `${Math.min(100, Math.max(0, (value / 5) * 100))}%`;
              const attention = value < ATTENTION_THRESHOLD;
              return (
                <div key={row.questionId}>
                  <div className="mb-2 flex justify-between gap-4 text-[13px] text-[var(--ink-mid)]">
                    <span>{row.label ?? row.questionId}</span>
                    <span className="font-semibold text-[var(--ink)]">{value.toFixed(2)}</span>
                  </div>
                  <div className="h-[3px] rounded-[var(--radius-pill)] bg-[var(--bg-active)]">
                    <div className="h-full rounded-[var(--radius-pill)]" style={{ width, background: attention ? "var(--red)" : "var(--ink)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ShellCard>

      {showEnpsSection && enpsReport ? (
        <ShellCard className="mt-[9px]">
          <h2 className="section-title">eNPS</h2>
          <p className="mt-1 secondary-text">% promoters (9-10) minus % detractors (0-6). A -100 to 100 scale.</p>
          <div className="mt-4 space-y-5">
            {enpsReport.rows.map((row) => (
              <div key={row.questionId}>
                <div className="mb-2 flex justify-between gap-4 text-[13px] text-[var(--ink-mid)]">
                  <span>{row.label ?? row.questionId}</span>
                  <span className="font-semibold text-[var(--ink)]">{Math.round(row.score)}</span>
                </div>
                <div className="flex h-[8px] overflow-hidden rounded-[var(--radius-pill)] bg-[var(--bg-active)]">
                  <div className="h-full bg-[var(--enps-promoter)]" style={{ width: `${row.promoterPct}%` }} title={`Promoters: ${row.promoterPct.toFixed(0)}%`} />
                  <div className="h-full bg-[var(--enps-passive)]" style={{ width: `${row.passivePct}%` }} title={`Passives: ${row.passivePct.toFixed(0)}%`} />
                  <div className="h-full bg-[var(--enps-detractor)]" style={{ width: `${row.detractorPct}%` }} title={`Detractors: ${row.detractorPct.toFixed(0)}%`} />
                </div>
                <div className="mt-1 flex justify-between text-xs text-[var(--ink-faint)]">
                  <span>{row.promoterPct.toFixed(0)}% promoters</span>
                  <span>{row.passivePct.toFixed(0)}% passives</span>
                  <span>{row.detractorPct.toFixed(0)}% detractors</span>
                </div>
              </div>
            ))}
          </div>
        </ShellCard>
      ) : null}

      {showTextSection && textReport ? (
        <ShellCard className="mt-[9px]">
          <h2 className="section-title">What people said</h2>
          {textReport.protected ? (
            <div className="mt-2">
              <div className="flex items-center gap-2 text-[14px] font-medium text-[var(--ink)]">
                <EyeOff size={16} strokeWidth={1.8} /> Comments hidden
              </div>
              <p className="mt-2 secondary-text">
                {/* Open text needs a higher bar than scores -- a sentence is more
                    identifying than a number, so this unlocks later even on the
                    same survey (minGroupSize + 3, not the bare threshold above). */}
                Written comments need more responses than group scores to stay safely anonymous
                {!department && textReport.n > 0 ? ` (${textReport.n} of ${minGroupSize + 3} so far)` : ""}.
              </p>
            </div>
          ) : (
            <>
              {/* Shown once for the whole section, not per-answer -- this is
                  a deliberate product decision (not algorithmic filtering):
                  responses are shown exactly as submitted. */}
              <p className="mt-1 secondary-text">Shown as submitted, unedited. This survey doesn&apos;t filter or moderate open responses.</p>
              <div className="mt-4 space-y-5">
                {textReport.rows.map((row) => (
                  <div key={row.questionId}>
                    <p className="text-[13px] font-medium text-[var(--ink-mid)]">{row.label ?? row.questionId}</p>
                    <div className="mt-2 space-y-2">
                      {row.answers.map((answer, index) => (
                        <p key={index} className="rounded-[var(--radius-input)] border border-[var(--border)] bg-white p-3 text-[13px] leading-[1.5] text-[var(--ink)]">
                          {answer}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </ShellCard>
      ) : null}

      {report && !report.protected ? (
        <ShellCard className="mt-[9px]">
          <h2 className="section-title">Commit to one change</h2>
          <p className="mt-1 secondary-text">Close the loop with your team: share this score and name one thing you&apos;ll do about it.</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              value={actionDraft}
              onChange={(event) => setActionDraft(event.target.value)}
              placeholder="e.g. Run a 15-min retro on workload next Friday"
              aria-label="One change you're committing to"
              className="admin-input flex-1"
            />
            <button onClick={submitAction} disabled={savingAction || !actionDraft.trim()} className="btn-primary shrink-0">
              {savingAction ? "Saving..." : "Commit"}
            </button>
          </div>
          {actions.length > 0 ? (
            <div className="mt-4 space-y-2">
              {actions.map((action) => (
                <div key={action.id} className="rounded-[var(--radius-input)] border border-[var(--border)] bg-white p-3 text-[13px]">
                  <p className="text-[var(--ink)]">{action.actionText}</p>
                  <p className="mt-1 text-xs text-[var(--ink-faint)]">{action.authorEmail}</p>
                </div>
              ))}
            </div>
          ) : null}
        </ShellCard>
      ) : null}
    </>
  );
}

"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { EyeOff } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CommentText, StrongLanguageBadge } from "@/components/CommentText";
import type { CommentDisplayMode } from "@/lib/profanityFilter";
import { titleCaseTeam } from "@/lib/textFormat";

type TextRow = { questionId: string; label?: string; construct?: string | null; n: number; answers: string[] };
type ReportResponse = {
  ok?: boolean;
  notFound?: boolean;
  textAnswers?: { protected: boolean; n: number; rows: TextRow[] };
};

/**
 * Filterable comments view -- a dedicated surface for open-text answers,
 * separate from the numeric report on the Results page. Filtering by team
 * re-fetches /api/report with a department param (server-side suppression,
 * see getProtectedOpenTextReport's department branch); filtering by theme
 * is a client-side narrowing of the already-suppressed rows already
 * returned -- no new suppression surface, same reasoning as
 * ThemeReportCard.
 */
export default function CommentsPage() {
  const params = useParams();
  const surveyId = params.surveyId as string;
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedConstruct, setSelectedConstruct] = useState("");
  const [result, setResult] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();
  // A per-viewer reading preference, not a tenant policy -- stored only in
  // this browser. Raw is the default everywhere: nothing is hidden or
  // softened unless the person reading it chooses to. Different readers
  // of the same anonymous comments genuinely have different tolerance for
  // strong language (a named manager reading a comment about themselves
  // is not the same experience as HR reading it), so this is deliberately
  // individual, not organization-wide.
  const [displayMode, setDisplayMode] = useState<CommentDisplayMode>("raw");

  useEffect(() => {
    // Deferred a tick, same reasoning as BrandProvider's cached-value
    // effect: keeps this out of the synchronous effect body so it can't
    // trigger a same-tick cascading render, and starting at "raw" matches
    // what the server rendered, so hydration has nothing to mismatch.
    try {
      const saved = window.localStorage.getItem("safersay-comment-display-mode");
      if (saved === "raw" || saved === "highlight" || saved === "filter") {
        queueMicrotask(() => setDisplayMode(saved));
      }
    } catch {
      // localStorage unavailable -- stay on the "raw" default.
    }
  }, []);

  function changeDisplayMode(mode: CommentDisplayMode) {
    setDisplayMode(mode);
    try {
      window.localStorage.setItem("safersay-comment-display-mode", mode);
    } catch {
      // Best-effort only -- the preference just won't persist across visits.
    }
  }

  useEffect(() => {
    fetch(`/api/report/departments?cycleId=${encodeURIComponent(surveyId)}`)
      .then((r) => r.json())
      .then((data: { ok?: boolean; departments?: string[] }) => {
        if (data.ok) setDepartments(data.departments ?? []);
      })
      .catch(() => undefined);
  }, [surveyId]);

  useEffect(() => {
    let cancelled = false;
    startTransition(() => {
      setLoading(true);
    });
    const params2 = new URLSearchParams({ cycleId: surveyId });
    if (selectedDepartment) params2.set("department", selectedDepartment);
    fetch(`/api/report?${params2.toString()}`)
      .then((r) => r.json())
      .then((data: ReportResponse) => {
        if (cancelled) return;
        setResult(data);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [surveyId, selectedDepartment]);

  const textReport = result?.textAnswers;
  const constructs = useMemo(() => {
    if (!textReport || textReport.protected) return [];
    return Array.from(new Set(textReport.rows.map((row) => row.construct?.trim() || "Other"))).sort();
  }, [textReport]);

  const visibleRows =
    textReport && !textReport.protected
      ? textReport.rows.filter((row) => !selectedConstruct || (row.construct?.trim() || "Other") === selectedConstruct)
      : [];

  return (
    <AppShell
      title="Comments"
      subtitle="What people said, filterable by team and theme."
      headerActions={
        <>
          <select
            value={displayMode}
            onChange={(e) => changeDisplayMode(e.target.value as CommentDisplayMode)}
            className="pill-select"
            title="How you'd like to read strong language in these comments -- only affects your own view."
          >
            <option value="raw">Raw clarity</option>
            <option value="highlight">Highlight strong language</option>
            <option value="filter">Filter strong language</option>
          </select>
          <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} className="pill-select" title="Team-level comments still respect the anonymity threshold.">
            <option value="">All teams</option>
            {departments.map((department) => (
              <option key={department} value={department}>
                {titleCaseTeam(department)}
              </option>
            ))}
          </select>
          {constructs.length > 0 ? (
            <select value={selectedConstruct} onChange={(e) => setSelectedConstruct(e.target.value)} className="pill-select">
              <option value="">All themes</option>
              {constructs.map((construct) => (
                <option key={construct} value={construct}>
                  {construct}
                </option>
              ))}
            </select>
          ) : null}
        </>
      }
    >
      {result?.notFound ? (
        <div className="card">
          <h2 className="section-title">Survey not found</h2>
          <p className="mt-2 secondary-text">This survey is unavailable in your workspace.</p>
        </div>
      ) : loading ? (
        <div className="card">
          <p className="secondary-text">Loading...</p>
        </div>
      ) : !textReport || textReport.protected ? (
        <div className="card">
          <div className="flex items-center gap-2 text-[14px] font-medium text-[var(--ink)]">
            <EyeOff size={16} strokeWidth={1.8} /> {selectedDepartment ? "Not available" : "Comments hidden"}
          </div>
          {/* Same deliberately generic copy department-scoped comments use
              elsewhere -- must not confirm whether this team is naturally
              below threshold or additionally suppressed to protect a
              sibling team. */}
          <p className="mt-2 secondary-text">
            {selectedDepartment ? "This view isn't available yet." : "Not enough responses yet to show comments without risking identifying someone."}
          </p>
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="card">
          <p className="secondary-text">No comments for this filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleRows.map((row) => (
            <div key={row.questionId} className="card">
              <p className="text-[13px] font-medium text-[var(--ink-mid)]">
                {row.label ?? row.questionId}
                {row.construct ? <span className="ml-2 text-[11px] font-normal uppercase tracking-[0.04em] text-[var(--ink-faint)]">{row.construct}</span> : null}
              </p>
              <div className="mt-2 space-y-2">
                {row.answers.map((answer, index) => (
                  <p key={index} className="rounded-[var(--radius-input)] border border-[var(--border)] bg-white p-3 text-[13px] leading-[1.5] text-[var(--ink)]">
                    <CommentText text={answer} mode={displayMode} />
                    {displayMode === "raw" ? <StrongLanguageBadge text={answer} /> : null}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}

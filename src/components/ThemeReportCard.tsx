"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown, ChevronRight, EyeOff } from "lucide-react";
import { Card } from "@/components/AppShell";
import { groupByConstruct, themeDeltasToOrg, type ThemeableRow, type ThemeBand } from "@/lib/reportThemes";

type ReportRow = { questionId: string; label?: string; construct?: string | null; n: number; average: number | null; scaleMax?: 5 | 10 };
type ReportResponse = {
  ok?: boolean;
  report?: { protected: boolean; n: number; rows: ReportRow[] };
};

const BAND_LABEL: Record<ThemeBand, string> = { strength: "Strength", neutral: "Neutral", priority: "Priority" };
const BAND_COLOR: Record<ThemeBand, string> = { strength: "var(--green)", neutral: "var(--ink-mid)", priority: "var(--red)" };

/**
 * Theme (construct) breakdown with a Strength/Neutral/Priority band per
 * theme and a per-question drill-down -- see src/lib/reportThemes.ts for
 * the grouping/banding math, shared with the Overview heatmap. When a
 * department scope is active, also shows each theme's difference from the
 * company-wide score -- both numbers are already-suppressed/already-
 * released report rows (see getProtectedReportForTenant), so the
 * difference itself discloses nothing new.
 */
export function ThemeReportCard({
  cycleId,
  department,
  initialExpandedConstruct,
}: {
  cycleId?: string;
  department?: string;
  /** Pre-expands one theme on first render -- used when arriving from the
   * Overview heatmap's "click a tile to explore" links, so the linked
   * theme opens already expanded instead of requiring a second click. */
  initialExpandedConstruct?: string;
}) {
  const [scopedRows, setScopedRows] = useState<ReportRow[] | null>(null);
  const [orgRows, setOrgRows] = useState<ReportRow[] | null>(null);
  const [protectedState, setProtectedState] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(initialExpandedConstruct ?? null);
  const [, startTransition] = useTransition();
  const requestKeyRef = useRef<string>("");

  useEffect(() => {
    const requestKey = `${cycleId ?? ""}|${department ?? ""}`;
    requestKeyRef.current = requestKey;
    startTransition(() => {
      setExpanded(initialExpandedConstruct ?? null);
    });

    const params = new URLSearchParams();
    if (cycleId) params.set("cycleId", cycleId);
    if (department) params.set("department", department);
    const scopedUrl = params.toString() ? `/api/report?${params.toString()}` : "/api/report";
    const orgUrl = cycleId ? `/api/report?cycleId=${encodeURIComponent(cycleId)}` : "/api/report";

    Promise.all([fetch(scopedUrl).then((r) => r.json()), department ? fetch(orgUrl).then((r) => r.json()) : Promise.resolve(null)])
      .then(([scoped, org]: [ReportResponse, ReportResponse | null]) => {
        if (requestKeyRef.current !== requestKey) return;
        const report = scoped.report;
        setProtectedState(!report || report.protected);
        setScopedRows(report && !report.protected ? report.rows : []);
        setOrgRows(org?.report && !org.report.protected ? org.report.rows : department ? [] : (report && !report.protected ? report.rows : []));
      })
      .catch(() => undefined);
  }, [cycleId, department, initialExpandedConstruct]);

  if (protectedState || !scopedRows) {
    return (
      <Card className="mt-[9px]">
        <h2 className="section-title">Themes</h2>
        <div className="mt-2 flex items-center gap-2 text-[14px] font-medium text-[var(--ink)]">
          <EyeOff size={16} strokeWidth={1.8} /> Not available
        </div>
        <p className="mt-2 secondary-text">Themes unlock at the same response threshold as group scores above -- not enough responses yet in this scope.</p>
      </Card>
    );
  }

  const themeableRows: ThemeableRow[] = scopedRows;
  const groups = groupByConstruct(themeableRows);
  const deltas = department && orgRows ? themeDeltasToOrg(groups, groupByConstruct(orgRows)) : null;

  if (groups.length === 0) return null;

  return (
    <Card className="mt-[9px]">
      <h2 className="section-title">Themes</h2>
      <p className="mt-1 secondary-text">Grouped by theme, with a strength/priority read at a glance.</p>
      <div className="mt-3 space-y-2">
        {groups.map((group) => {
          const isOpen = expanded === group.construct;
          const delta = deltas?.get(group.construct);
          return (
            <div key={group.construct} className="rounded-[var(--radius-card)] border border-[var(--border)]">
              <button
                onClick={() => setExpanded(isOpen ? null : group.construct)}
                className="flex w-full items-center justify-between gap-3 p-3 text-left"
              >
                <span className="flex items-center gap-2">
                  {isOpen ? <ChevronDown size={14} strokeWidth={1.8} /> : <ChevronRight size={14} strokeWidth={1.8} />}
                  <span className="text-[13px] font-medium text-[var(--ink)]">{group.construct}</span>
                </span>
                <span className="flex items-center gap-3 text-[13px]">
                  {delta !== undefined ? (
                    <span className={delta >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}>
                      {delta >= 0 ? "+" : ""}
                      {delta.toFixed(1)} vs. company
                    </span>
                  ) : null}
                  <span className="rounded-[var(--radius-pill)] px-2 py-0.5 text-[11px] font-medium text-white" style={{ background: BAND_COLOR[group.band] }}>
                    {BAND_LABEL[group.band]}
                  </span>
                  <span className="font-semibold text-[var(--ink)]">{group.average10.toFixed(1)}</span>
                </span>
              </button>
              {isOpen ? (
                <div className="space-y-2 border-t border-[var(--border)] p-3">
                  {group.rows.map((row) => (
                    <div key={row.questionId} className="flex items-center justify-between gap-3 text-[13px] text-[var(--ink-mid)]">
                      <span>{row.label ?? row.questionId}</span>
                      <span className="font-medium text-[var(--ink)]">{row.average10.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

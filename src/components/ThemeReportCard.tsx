"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown, EyeOff, TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/AppShell";
import { getScoreTier } from "@/lib/scoreTier";
import { groupByConstruct, themeDeltasToOrg, type ThemeableRow } from "@/lib/reportThemes";

type ReportRow = { questionId: string; label?: string; construct?: string | null; n: number; average: number | null; scaleMax?: 5 | 10 };
type ReportResponse = {
  ok?: boolean;
  report?: { protected: boolean; n: number; rows: ReportRow[] };
};

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
        <h2 className="section-title">Theme heatmap</h2>
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

  const openGroup = groups.find((group) => group.construct === expanded);

  return (
    <Card className="mt-[9px]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="section-title">Theme heatmap</h2>
          <p className="mt-1 secondary-text">Theme scores at a glance. Click a theme to explore in more detail.</p>
        </div>
        <div className="hidden shrink-0 items-center gap-3 text-[11px] text-[var(--ink-faint)] sm:flex">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: "var(--red)" }} /> Lower
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: "var(--warning)" }} /> Neutral
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: "var(--green)" }} /> Higher
          </span>
        </div>
      </div>

      <div className="mt-3.5 flex gap-2.5 overflow-x-auto pb-1">
        {groups.map((group) => {
          const tier = getScoreTier(group.average10);
          const isOpen = expanded === group.construct;
          const delta = deltas?.get(group.construct);
          return (
            <button
              key={group.construct}
              onClick={() => setExpanded(isOpen ? null : group.construct)}
              className="w-[168px] shrink-0 rounded-[var(--radius-card)] border p-3.5 text-left transition"
              style={{
                background: tier.bg,
                borderColor: isOpen ? tier.text : tier.border,
                boxShadow: isOpen ? `0 0 0 1.5px ${tier.text}` : undefined,
              }}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold text-white" style={{ background: tier.text }}>
                {group.average10.toFixed(0)}
              </span>
              <p className="mt-2.5 text-[13px] font-semibold leading-[1.3] text-[var(--ink)]">{group.construct}</p>
              <p className="mt-1.5 text-[19px] font-semibold" style={{ color: tier.text }}>
                {group.average10.toFixed(1)}
              </p>
              {delta !== undefined ? (
                <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium" style={{ color: delta >= 0 ? "var(--green)" : "var(--red)" }}>
                  {delta >= 0 ? <TrendingUp size={11} strokeWidth={2} /> : <TrendingDown size={11} strokeWidth={2} />}
                  {delta >= 0 ? "+" : ""}
                  {delta.toFixed(1)} vs overall
                </p>
              ) : null}
              <p className="mt-1.5 text-[11px] text-[var(--ink-faint)]">
                {group.questionCount} question{group.questionCount === 1 ? "" : "s"}
              </p>
            </button>
          );
        })}
      </div>

      {openGroup ? (
        <div className="mt-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] p-3.5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[13px] font-semibold text-[var(--ink)]">{openGroup.construct}</h3>
            <button onClick={() => setExpanded(null)} className="flex items-center gap-1 text-[11.5px] font-medium text-[var(--ink-mid)] hover:text-[var(--ink)]">
              <ChevronDown size={13} strokeWidth={1.8} /> Collapse
            </button>
          </div>
          <div className="mt-2.5 space-y-2">
            {openGroup.rows.map((row) => (
              <div key={row.questionId} className="flex items-center justify-between gap-3 text-[13px] text-[var(--ink-mid)]">
                <span>{row.label ?? row.questionId}</span>
                <span className="font-medium text-[var(--ink)]">{row.average10.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  );
}

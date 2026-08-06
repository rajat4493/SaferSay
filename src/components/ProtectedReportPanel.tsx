"use client";

import { useEffect, useState, useTransition } from "react";
import { Download, EyeOff, RefreshCw, Share2 } from "lucide-react";
import { Card } from "@/components/AppShell";
import { ConfidentialitySeal } from "@/components/ConfidentialitySeal";
import { SkeletonCard, SkeletonText } from "@/components/Skeleton";
import { useToast } from "@/components/ToastProvider";
import { ViewerCard } from "@/components/ViewerShell";

type CycleAction = { id: string; authorEmail: string; actionText: string; createdAt: string };

type ReportResponse = {
  ok?: boolean;
  error?: string;
  cycle?: { id: string; name: string; minGroupSize: number } | null;
  report?: {
    protected: boolean;
    n: number;
    rows: Array<{ questionId: string; label?: string; n: number; average: number | null }>;
  };
};

export function ProtectedReportPanel({ mode = "admin", cycleId }: { mode?: "admin" | "viewer"; cycleId?: string }) {
  const [result, setResult] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();
  const [actions, setActions] = useState<CycleAction[]>([]);
  const [actionDraft, setActionDraft] = useState("");
  const [savingAction, setSavingAction] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const toast = useToast();
  const ShellCard = mode === "viewer" ? ViewerCard : Card;

  async function loadReport() {
    setLoading(true);
    const reportUrl = cycleId ? `/api/report?cycleId=${encodeURIComponent(cycleId)}` : "/api/report";
    const response = await fetch(reportUrl);
    const data = (await response.json().catch(() => ({ ok: false, error: "Report could not be loaded." }))) as ReportResponse;
    setResult(data);
    setLoading(false);
    if (data.error) toast.show({ variant: "error", message: data.error });
    if (data.cycle?.id) {
      const actionsResponse = await fetch(`/api/report/action?cycleId=${data.cycle.id}`);
      const actionsData = (await actionsResponse.json().catch(() => ({}))) as { ok?: boolean; actions?: CycleAction[] };
      if (actionsData.ok) setActions(actionsData.actions ?? []);
    }
  }

  useEffect(() => {
    startTransition(() => {
      loadReport();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleId]);

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
        <ConfidentialitySeal />
        <div className="grid gap-4 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="mt-4 rounded-[var(--radius-card)] border border-[var(--brand-glass-border)] bg-[var(--brand-glass-strong)] p-6 shadow-[var(--shadow-soft)]">
          <SkeletonText lines={4} />
        </div>
      </>
    );
  }

  return (
    <>
      <ConfidentialitySeal />
      <div className="grid gap-4 lg:grid-cols-3">
        <ShellCard><h2 className="font-[family-name:var(--font-display)] text-5xl font-semibold tracking-[-0.03em]">{report?.n ?? 0}</h2><p className="mt-1 text-sm text-[var(--brand-muted)]">Responses</p></ShellCard>
        <ShellCard><h2 className="font-[family-name:var(--font-display)] text-5xl font-semibold tracking-[-0.03em]">{minGroupSize}</h2><p className="mt-1 text-sm text-[var(--brand-muted)]">Minimum group size</p></ShellCard>
        <div
          className={`rounded-[var(--radius-card)] p-5 shadow-[var(--shadow-soft)] ${
            report?.protected
              ? "border border-[var(--brand-border)] bg-[var(--brand-surface)]"
              : "bg-[var(--brand-ink)] text-white"
          }`}
        >
          <h2 className="font-[family-name:var(--font-display)] text-5xl font-semibold tracking-[-0.03em]">{report?.protected ? "Protected" : "Unlocked"}</h2>
          <p className={`mt-1 text-sm ${report?.protected ? "text-[var(--brand-muted)]" : "text-white/60"}`}>Report state</p>
        </div>
      </div>

      <ShellCard>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{result?.cycle?.name ?? "Latest survey report"}</h2>
            <p className="mt-1 text-sm text-[var(--brand-muted)]">Supabase-backed aggregate report. No participant list, emails, or token state.</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button onClick={loadReport} className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-border)] bg-white px-4 py-2 text-sm font-semibold">
              <RefreshCw size={14} />
              Refresh
            </button>
            {report && !report.protected ? (
              <>
                <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-border)] bg-white px-4 py-2 text-sm font-semibold">
                  <Download size={14} />
                  Export CSV
                </button>
                <button onClick={shareScore} className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-ink)] px-4 py-2 text-sm font-semibold text-white">
                  <Share2 size={14} />
                  {shareCopied ? "Copied" : "Share score"}
                </button>
              </>
            ) : null}
          </div>
        </div>

        {loading ? (
          <SkeletonText lines={3} />
        ) : result?.error ? (
          <p className="text-sm font-semibold text-[#9a392d]">{result.error}</p>
        ) : !report || report.protected ? (
          <div>
            <div className="flex items-center gap-2 font-semibold text-[var(--brand-accent)]"><EyeOff size={18} /> Results hidden</div>
            <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">The report will unlock only after at least {minGroupSize} submissions exist.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {report.rows.map((row) => {
              const value = row.average ?? 0;
              const width = `${Math.min(100, Math.max(0, (value / 5) * 100))}%`;
              return (
                <div key={row.questionId}>
                  <div className="mb-2 flex justify-between gap-4 text-sm">
                    <span>{row.label ?? row.questionId}</span>
                    <span className="font-semibold">{value.toFixed(2)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--brand-border)]"><div className="h-full rounded-full bg-[var(--brand-accent)]" style={{ width }} /></div>
                </div>
              );
            })}
          </div>
        )}
      </ShellCard>

      {report && !report.protected ? (
        <ShellCard>
          <h2 className="text-xl font-semibold">Commit to one change</h2>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">
            Close the loop with your team: share this score and name one thing you&apos;ll do about it.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              value={actionDraft}
              onChange={(event) => setActionDraft(event.target.value)}
              placeholder="e.g. Run a 15-min retro on workload next Friday"
              className="h-11 flex-1 rounded-[var(--radius-pill)] border border-[var(--brand-border)] bg-white px-4 text-sm outline-none focus:border-[var(--brand-accent)]"
            />
            <button
              onClick={submitAction}
              disabled={savingAction || !actionDraft.trim()}
              className="h-11 shrink-0 rounded-[var(--radius-pill)] bg-[var(--brand-accent)] px-5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {savingAction ? "Saving..." : "Commit"}
            </button>
          </div>
          {actions.length > 0 ? (
            <div className="mt-4 space-y-2">
              {actions.map((action) => (
                <div key={action.id} className="rounded-2xl border border-[var(--brand-border)] bg-white p-3 text-sm">
                  <p>{action.actionText}</p>
                  <p className="mt-1 text-xs text-[var(--brand-muted)]">{action.authorEmail}</p>
                </div>
              ))}
            </div>
          ) : null}
        </ShellCard>
      ) : null}
    </>
  );
}

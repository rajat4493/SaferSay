"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/AppShell";
import { useToast } from "@/components/ToastProvider";

type Commitment = {
  id: string; statement: string; targetDate: string;
  status: "published" | "in_progress" | "completed";
  progressUpdate: string | null; publishedAt: string; updatedAt: string; source: "manual" | "insight";
};

/**
 * "You said / We will" -- any number of commitments per cycle now (a
 * cycle used to carry at most one; see 0048_action_tracking.sql). Each
 * one is independently trackable: published, then moved to in-progress
 * or completed with its own progress note. Only rendered when the
 * tenant's action_mode isn't "insights_only" -- see the Results page's
 * own gate -- since tracking is the tenant's opt-in choice, not a
 * default.
 */
export function CycleCommitmentPanel({ cycleId }: { cycleId: string }) {
  const toast = useToast();
  const [commitments, setCommitments] = useState<Commitment[] | null>(null);
  const [statement, setStatement] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [progressDrafts, setProgressDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  function load() {
    fetch(`/api/report/commitment?cycleId=${encodeURIComponent(cycleId)}`)
      .then((response) => response.json())
      .then((data: { ok?: boolean; commitments?: Commitment[] }) => {
        if (data.ok) setCommitments(data.commitments ?? []);
      })
      .catch(() => undefined);
  }

  useEffect(() => {
    load();
  }, [cycleId]);

  async function publish() {
    setSaving("new");
    const response = await fetch("/api/report/commitment", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ cycleId, statement: statement.trim(), targetDate }),
    });
    const data = await response.json().catch(() => ({ ok: false, error: "Commitment could not be published." })) as { ok?: boolean; error?: string; delivery?: { sent: number; failed: number } };
    setSaving(null);
    if (!data.ok) return toast.show({ variant: "error", message: data.error ?? "Commitment could not be published." });
    setStatement("");
    setTargetDate("");
    load();
    toast.show({ variant: data.delivery?.failed ? "error" : "success", message: data.delivery?.failed ? "Commitment published, but some employee updates could not be delivered." : "Commitment published and shared with the team." });
  }

  async function update(commitmentId: string, status: "in_progress" | "completed") {
    setSaving(commitmentId);
    const response = await fetch("/api/report/commitment", {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ commitmentId, status, progressUpdate: (progressDrafts[commitmentId] ?? "").trim() }),
    });
    const data = await response.json().catch(() => ({ ok: false, error: "Commitment update could not be saved." })) as { ok?: boolean; error?: string };
    setSaving(null);
    if (!data.ok) return toast.show({ variant: "error", message: data.error ?? "Commitment update could not be saved." });
    setProgressDrafts((current) => ({ ...current, [commitmentId]: "" }));
    load();
    toast.show({ variant: "success", message: "Commitment progress updated." });
  }

  return (
    <Card className="mt-[9px]">
      <h2 className="section-title">You said / We will</h2>
      <p className="mt-1 secondary-text">Publish concrete changes and target dates. The employee update never includes individual answers or participation data.</p>

      {commitments === null ? null : commitments.length === 0 ? null : (
        <div className="mt-4 space-y-3">
          {commitments.map((commitment) => (
            <div key={commitment.id} className="rounded-[var(--radius-input)] border border-[var(--border)] bg-white p-4">
              <div className="flex items-center gap-2">
                <p className="font-medium text-[var(--ink)]">{commitment.statement}</p>
                {commitment.source === "insight" ? <span className="badge-beta">From AI Synthesis</span> : null}
              </div>
              <p className="mt-1 text-xs text-[var(--ink-faint)]">Target: {commitment.targetDate} · {commitment.status.replaceAll("_", " ")}</p>
              {commitment.progressUpdate ? <p className="mt-3 secondary-text">{commitment.progressUpdate}</p> : null}
              {commitment.status !== "completed" ? (
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={progressDrafts[commitment.id] ?? ""}
                    onChange={(event) => setProgressDrafts((current) => ({ ...current, [commitment.id]: event.target.value }))}
                    maxLength={500}
                    placeholder="Share a brief progress update"
                    className="admin-input flex-1"
                  />
                  <button onClick={() => update(commitment.id, "in_progress")} disabled={saving === commitment.id} className="btn-secondary">In progress</button>
                  <button onClick={() => update(commitment.id, "completed")} disabled={saving === commitment.id} className="btn-primary">Mark complete</button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_180px_auto]">
        <input value={statement} onChange={(event) => setStatement(event.target.value)} maxLength={500} placeholder="e.g. We will simplify priorities and reduce recurring meetings." className="admin-input" />
        <input value={targetDate} onChange={(event) => setTargetDate(event.target.value)} type="date" className="admin-input" />
        <button onClick={publish} disabled={saving === "new" || !statement.trim() || !targetDate} className="btn-primary">{saving === "new" ? "Publishing..." : "Publish commitment"}</button>
      </div>
    </Card>
  );
}

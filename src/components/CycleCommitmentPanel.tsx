"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/AppShell";
import { useToast } from "@/components/ToastProvider";

type Commitment = {
  id: string; statement: string; targetDate: string;
  status: "published" | "in_progress" | "completed";
  progressUpdate: string | null; publishedAt: string; updatedAt: string;
};

export function CycleCommitmentPanel({ cycleId }: { cycleId: string }) {
  const toast = useToast();
  const [commitment, setCommitment] = useState<Commitment | null>(null);
  const [statement, setStatement] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [progress, setProgress] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/report/commitment?cycleId=${encodeURIComponent(cycleId)}`)
      .then((response) => response.json())
      .then((data: { ok?: boolean; commitments?: Commitment[] }) => {
        if (!cancelled && data.ok) setCommitment(data.commitments?.[0] ?? null);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [cycleId]);

  async function publish() {
    setSaving(true);
    const response = await fetch("/api/report/commitment", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ cycleId, statement: statement.trim(), targetDate }),
    });
    const data = await response.json().catch(() => ({ ok: false, error: "Commitment could not be published." })) as { ok?: boolean; error?: string; commitment?: Commitment; delivery?: { sent: number; failed: number } };
    setSaving(false);
    if (!data.ok || !data.commitment) return toast.show({ variant: "error", message: data.error ?? "Commitment could not be published." });
    setCommitment(data.commitment); setStatement(""); setTargetDate("");
    toast.show({ variant: data.delivery?.failed ? "error" : "success", message: data.delivery?.failed ? "Commitment published, but some employee updates could not be delivered." : "Commitment published and shared with the team." });
  }

  async function update(status: "in_progress" | "completed") {
    setSaving(true);
    const response = await fetch("/api/report/commitment", {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ cycleId, status, progressUpdate: progress.trim() }),
    });
    const data = await response.json().catch(() => ({ ok: false, error: "Commitment update could not be saved." })) as { ok?: boolean; error?: string; commitment?: Commitment };
    setSaving(false);
    if (!data.ok || !data.commitment) return toast.show({ variant: "error", message: data.error ?? "Commitment update could not be saved." });
    setCommitment(data.commitment); setProgress(""); toast.show({ variant: "success", message: "Commitment progress updated." });
  }

  return (
    <Card className="mt-[9px]">
      <h2 className="section-title">You said / We will</h2>
      <p className="mt-1 secondary-text">Publish one concrete change and target date. The employee update never includes individual answers or participation data.</p>
      {commitment ? (
        <div className="mt-4 rounded-[var(--radius-input)] border border-[var(--border)] bg-white p-4">
          <p className="font-medium text-[var(--ink)]">{commitment.statement}</p>
          <p className="mt-1 text-xs text-[var(--ink-faint)]">Target: {commitment.targetDate} · {commitment.status.replaceAll("_", " ")}</p>
          {commitment.progressUpdate ? <p className="mt-3 secondary-text">{commitment.progressUpdate}</p> : null}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input value={progress} onChange={(event) => setProgress(event.target.value)} maxLength={500} placeholder="Share a brief progress update" className="admin-input flex-1" />
            <button onClick={() => update("in_progress")} disabled={saving} className="btn-secondary">In progress</button>
            <button onClick={() => update("completed")} disabled={saving} className="btn-primary">Mark complete</button>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_180px_auto]">
          <input value={statement} onChange={(event) => setStatement(event.target.value)} maxLength={500} placeholder="e.g. We will simplify priorities and reduce recurring meetings." className="admin-input" />
          <input value={targetDate} onChange={(event) => setTargetDate(event.target.value)} type="date" className="admin-input" />
          <button onClick={publish} disabled={saving || !statement.trim() || !targetDate} className="btn-primary">{saving ? "Publishing..." : "Publish commitment"}</button>
        </div>
      )}
    </Card>
  );
}

"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Send } from "lucide-react";
import { Card } from "@/components/AppShell";
import { InlineSpinnerRow } from "@/components/Skeleton";
import { useToast } from "@/components/ToastProvider";

type OutboxResult = {
  ok?: boolean;
  error?: string;
  cycleId?: string;
  invitesPrepared?: number;
  remindersPrepared?: number;
  queued?: number;
  delivery?: { sent: number; failed: number; errors: string[] };
  summary?: {
    pendingInvites: number;
    queuedInvites: number;
    sentInvites: number;
    pendingReminders: number;
    queuedReminders: number;
    sentReminders: number;
  };
  rows?: Array<{
    id: string;
    deliveryType: "invite" | "reminder";
    deliveryStatus: string;
    email: string;
    name: string | null;
    reminderCount: number;
    tokenStatus: string;
    respondentPath: string | null;
  }>;
};

export function InviteOutboxPanel({ cycleId }: { cycleId?: string } = {}) {
  const [result, setResult] = useState<OutboxResult | null>(null);
  const [loading, setLoading] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const toast = useToast();

  async function copyLink(id: string, path: string) {
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(""), 2000);
  }

  async function call(path: string, body?: Record<string, unknown>, label = "Working") {
    setLoading(label);
    const scopedBody = body ? { ...body, cycleId: body.cycleId ?? cycleId } : undefined;
    const scopedPath = !body && cycleId ? `${path}?cycleId=${encodeURIComponent(cycleId)}` : path;
    const response = await fetch(scopedPath, {
      method: body ? "POST" : "GET",
      headers: { "content-type": "application/json" },
      body: scopedBody ? JSON.stringify(scopedBody) : undefined,
    });
    const data = (await response.json().catch(() => ({ ok: false, error: "Request failed." }))) as OutboxResult;
    setResult(data);
    setLoading("");
    if (data.error) toast.show({ variant: "error", message: data.error });
    else if (data.delivery) toast.show({ variant: data.delivery.failed === 0 ? "success" : "error", message: `${data.delivery.sent} sent, ${data.delivery.failed} failed.` });
    else if (label === "Preparing" || label === "Queueing") toast.show({ variant: "success", message: `${label === "Preparing" ? "Prepared" : "Queued"}.` });
  }

  const summary = result?.summary;

  return (
    <Card className="mt-[9px]">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="meta-label">Identity-side outbox</p>
          <h2 className="section-title mt-2">Invite outbox</h2>
          <p className="mt-1.5 max-w-2xl secondary-text">
            Prepares invitation and reminder work from participant tokens only. Test-mode sending uses Resend and updates this identity-side outbox.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <button onClick={() => call("/api/invites/outbox", undefined, "Loading")} className="btn-secondary">
            Refresh
          </button>
          <button onClick={() => call("/api/invites/outbox", {}, "Preparing")} className="btn-primary">
            Prepare invites
          </button>
          <button onClick={() => call("/api/invites/outbox", { includeReminders: true }, "Preparing")} className="btn-secondary">
            Prepare reminders
          </button>
          <button onClick={() => call("/api/invites/queue", { deliveryType: "invite" }, "Queueing")} className="btn-primary btn-pill">
            <Send size={13} strokeWidth={1.8} />
            Queue invites
          </button>
          <button onClick={() => call("/api/invites/queue", { deliveryType: "invite", sendNow: true }, "Sending")} className="btn-primary btn-pill">
            <Send size={13} strokeWidth={1.8} />
            Send test invites
          </button>
          <button onClick={() => call("/api/invites/queue", { deliveryType: "reminder" }, "Queueing")} className="btn-secondary btn-pill">
            <Send size={13} strokeWidth={1.8} />
            Queue reminders
          </button>
          <button onClick={() => call("/api/invites/queue", { deliveryType: "reminder", sendNow: true }, "Sending")} className="btn-secondary btn-pill">
            <Send size={13} strokeWidth={1.8} />
            Send test reminders
          </button>
        </div>
      </div>

      {loading ? <InlineSpinnerRow label={loading} /> : null}
      {result?.error ? <p className="mt-4 secondary-text font-medium text-[var(--red)]">{result.error}</p> : null}
      {result?.delivery ? (
        <p className="mt-4 rounded-[var(--radius-card)] bg-[var(--bg)] p-3 secondary-text font-medium">
          Resend test delivery: {result.delivery.sent} sent, {result.delivery.failed} failed.
          {result.delivery.errors.length > 0 ? ` ${result.delivery.errors[0]}` : ""}
        </p>
      ) : null}

      {summary ? (
        <div className="mt-5 grid gap-2.5 md:grid-cols-3">
          <Metric label="Pending invites" value={summary.pendingInvites} />
          <Metric label="Queued invites" value={summary.queuedInvites} />
          <Metric label="Sent invites" value={summary.sentInvites} />
          <Metric label="Pending reminders" value={summary.pendingReminders} />
          <Metric label="Queued reminders" value={summary.queuedReminders} />
          <Metric label="Sent reminders" value={summary.sentReminders} />
        </div>
      ) : null}

      {result?.rows && result.rows.length > 0 ? (
        <div className="mt-5 max-h-96 overflow-auto rounded-[var(--radius-card)] border border-[var(--border)] bg-white">
          {result.rows.slice(0, 12).map((row) => (
            <div key={row.id} className="grid gap-3 border-b border-[var(--border)] p-3 text-[13px] last:border-b-0 md:grid-cols-[1fr_110px_110px_90px]">
              <div>
                <div className="font-medium text-[var(--ink)]">{row.name || row.email}</div>
                <div className="text-[var(--ink-mid)]">{row.email}</div>
                {row.respondentPath ? (
                  <div className="mt-2 flex items-center gap-2">
                    <button onClick={() => copyLink(row.id, row.respondentPath!)} className="btn-secondary btn-pill px-3 py-1.5 text-xs">
                      {copiedId === row.id ? <Check size={12} strokeWidth={1.8} /> : <Copy size={12} strokeWidth={1.8} />}
                      {copiedId === row.id ? "Copied" : "Copy link"}
                    </button>
                    <a href={row.respondentPath} target="_blank" rel="noreferrer" className="btn-secondary btn-pill px-3 py-1.5 text-xs">
                      <ExternalLink size={12} strokeWidth={1.8} />
                      Open
                    </a>
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-[var(--ink-faint)]">No link yet</div>
                )}
              </div>
              <span className="text-[var(--ink-mid)]">{row.deliveryType}</span>
              <span className="font-medium text-[var(--ink)]">{row.deliveryStatus}</span>
              <span className="text-[var(--ink-mid)]">{row.tokenStatus}</span>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-4">
      <div className="data-number">{value}</div>
      <p className="secondary-text">{label}</p>
    </div>
  );
}

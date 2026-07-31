"use client";

import { useState } from "react";
import { MailCheck, Send } from "lucide-react";
import { Card } from "@/components/AppShell";

type OutboxResult = {
  ok?: boolean;
  error?: string;
  cycleId?: string;
  invitesPrepared?: number;
  remindersPrepared?: number;
  queued?: number;
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
  }>;
};

export function InviteOutboxPanel() {
  const [result, setResult] = useState<OutboxResult | null>(null);
  const [loading, setLoading] = useState("");

  async function call(path: string, body?: object, label = "Working") {
    setLoading(label);
    const response = await fetch(path, {
      method: body ? "POST" : "GET",
      headers: { "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    setResult((await response.json().catch(() => ({ ok: false, error: "Request failed." }))) as OutboxResult);
    setLoading("");
  }

  const summary = result?.summary;

  return (
    <Card className="mt-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-accent)]">
            <MailCheck size={14} />
            Identity-side outbox
          </div>
          <h2 className="mt-3 text-xl font-semibold">Invite outbox</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--brand-muted)]">
            Prepares invitation and reminder work from participant tokens only. Email sending stays parked until Resend is connected.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <button onClick={() => call("/api/invites/outbox", undefined, "Loading")} className="rounded-full border border-[var(--brand-border)] bg-white px-4 py-2 text-sm font-semibold">
            Refresh
          </button>
          <button onClick={() => call("/api/invites/outbox", {}, "Preparing")} className="rounded-full bg-[var(--brand-ink)] px-4 py-2 text-sm font-semibold text-white">
            Prepare invites
          </button>
          <button onClick={() => call("/api/invites/outbox", { includeReminders: true }, "Preparing")} className="rounded-full border border-[var(--brand-border)] bg-white px-4 py-2 text-sm font-semibold">
            Prepare reminders
          </button>
          <button onClick={() => call("/api/invites/queue", { deliveryType: "invite" }, "Queueing")} className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--brand-accent)] px-4 py-2 text-sm font-semibold text-white">
            <Send size={14} />
            Queue invites
          </button>
        </div>
      </div>

      {loading ? <p className="mt-4 text-sm font-semibold text-[var(--brand-muted)]">{loading}...</p> : null}
      {result?.error ? <p className="mt-4 text-sm font-semibold text-[#9a392d]">{result.error}</p> : null}

      {summary ? (
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Metric label="Pending invites" value={summary.pendingInvites} />
          <Metric label="Queued invites" value={summary.queuedInvites} />
          <Metric label="Sent invites" value={summary.sentInvites} />
          <Metric label="Pending reminders" value={summary.pendingReminders} />
          <Metric label="Queued reminders" value={summary.queuedReminders} />
          <Metric label="Sent reminders" value={summary.sentReminders} />
        </div>
      ) : null}

      {result?.rows && result.rows.length > 0 ? (
        <div className="mt-5 max-h-72 overflow-auto rounded-2xl border border-[var(--brand-border)] bg-white">
          {result.rows.slice(0, 12).map((row) => (
            <div key={row.id} className="grid gap-3 border-b border-[var(--brand-border)] p-3 text-sm last:border-b-0 md:grid-cols-[1fr_110px_110px_90px]">
              <div>
                <div className="font-semibold">{row.name || row.email}</div>
                <div className="text-[var(--brand-muted)]">{row.email}</div>
              </div>
              <span className="text-[var(--brand-muted)]">{row.deliveryType}</span>
              <span className="font-semibold">{row.deliveryStatus}</span>
              <span className="text-[var(--brand-muted)]">{row.tokenStatus}</span>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[var(--brand-border)] bg-white p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <p className="text-sm text-[var(--brand-muted)]">{label}</p>
    </div>
  );
}

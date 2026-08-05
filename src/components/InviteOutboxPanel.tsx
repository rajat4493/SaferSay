"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, MailCheck, Send } from "lucide-react";
import { Card } from "@/components/AppShell";

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

export function InviteOutboxPanel() {
  const [result, setResult] = useState<OutboxResult | null>(null);
  const [loading, setLoading] = useState("");
  const [copiedId, setCopiedId] = useState("");

  async function copyLink(id: string, path: string) {
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(""), 2000);
  }

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
            Prepares invitation and reminder work from participant tokens only. Test-mode sending uses Resend and updates this identity-side outbox.
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
          <button onClick={() => call("/api/invites/queue", { deliveryType: "invite", sendNow: true }, "Sending")} className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--brand-ink)] px-4 py-2 text-sm font-semibold text-white">
            <Send size={14} />
            Send test invites
          </button>
          <button onClick={() => call("/api/invites/queue", { deliveryType: "reminder" }, "Queueing")} className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--brand-border)] bg-white px-4 py-2 text-sm font-semibold">
            <Send size={14} />
            Queue reminders
          </button>
          <button onClick={() => call("/api/invites/queue", { deliveryType: "reminder", sendNow: true }, "Sending")} className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--brand-border)] bg-white px-4 py-2 text-sm font-semibold">
            <Send size={14} />
            Send test reminders
          </button>
        </div>
      </div>

      {loading ? <p className="mt-4 text-sm font-semibold text-[var(--brand-muted)]">{loading}...</p> : null}
      {result?.error ? <p className="mt-4 text-sm font-semibold text-[#9a392d]">{result.error}</p> : null}
      {result?.delivery ? (
        <p className="mt-4 rounded-2xl bg-[var(--brand-bg)] p-3 text-sm font-semibold text-[var(--brand-muted)]">
          Resend test delivery: {result.delivery.sent} sent, {result.delivery.failed} failed.
          {result.delivery.errors.length > 0 ? ` ${result.delivery.errors[0]}` : ""}
        </p>
      ) : null}

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
        <div className="mt-5 max-h-96 overflow-auto rounded-2xl border border-[var(--brand-border)] bg-white">
          {result.rows.slice(0, 12).map((row) => (
            <div key={row.id} className="grid gap-3 border-b border-[var(--brand-border)] p-3 text-sm last:border-b-0 md:grid-cols-[1fr_110px_110px_90px]">
              <div>
                <div className="font-semibold">{row.name || row.email}</div>
                <div className="text-[var(--brand-muted)]">{row.email}</div>
                {row.respondentPath ? (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => copyLink(row.id, row.respondentPath!)}
                      className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--brand-border)] bg-white px-3 py-1.5 text-xs font-semibold"
                    >
                      {copiedId === row.id ? <Check size={12} /> : <Copy size={12} />}
                      {copiedId === row.id ? "Copied" : "Copy link"}
                    </button>
                    <a
                      href={row.respondentPath}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--brand-border)] bg-white px-3 py-1.5 text-xs font-semibold"
                    >
                      <ExternalLink size={12} />
                      Open
                    </a>
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-[var(--brand-muted)]">No link yet</div>
                )}
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

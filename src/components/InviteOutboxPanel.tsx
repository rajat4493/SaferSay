"use client";

import { useEffect, useState, useTransition } from "react";
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

type SendState = {
  cycleStatus: string;
  sentInvites: number;
  issued: number;
  spent: number;
};

export function InviteOutboxPanel({ cycleId }: { cycleId?: string } = {}) {
  const [sendState, setSendState] = useState<SendState | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<OutboxResult | null>(null);
  const [loading, setLoading] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [developerMode, setDeveloperMode] = useState(false);
  const [, startTransition] = useTransition();
  const toast = useToast();

  async function loadSendState() {
    if (!cycleId) return;
    const response = await fetch(`/api/cycles/${cycleId}`);
    const data = (await response.json().catch(() => ({ ok: false }))) as {
      ok?: boolean;
      cycle?: { status: string };
      outbox?: { sentInvites: number };
      participation?: { issued: number; spent: number };
    };
    if (data.ok && data.cycle && data.participation) {
      setSendState({
        cycleStatus: data.cycle.status,
        sentInvites: data.outbox?.sentInvites ?? 0,
        issued: data.participation.issued,
        spent: data.participation.spent,
      });
    }
  }

  useEffect(() => {
    startTransition(() => {
      void loadSendState();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleId]);

  useEffect(() => {
    fetch("/api/readiness")
      .then((response) => response.json())
      .then((data: { mode?: string }) => setDeveloperMode(data.mode !== "production"))
      .catch(() => setDeveloperMode(false));
  }, []);

  async function sendSmart(deliveryType: "invite" | "reminder") {
    setSending(true);
    const response = await fetch("/api/invites/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cycleId, deliveryType }),
    });
    const data = (await response.json().catch(() => ({ ok: false, error: "Request failed." }))) as OutboxResult;
    setSending(false);
    if (data.error) {
      toast.show({ variant: "error", message: data.error });
    } else if (data.delivery) {
      toast.show({ variant: data.delivery.failed === 0 ? "success" : "error", message: `${data.delivery.sent} sent, ${data.delivery.failed} failed.` });
    }
    await loadSendState();
  }

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
    await loadSendState();
  }

  const summary = result?.summary;

  return (
    <Card className="mt-[9px]">
      <p className="meta-label">Send</p>
      <h2 className="section-title mt-2">Invite outbox</h2>
      <p className="mt-1.5 max-w-2xl secondary-text">Sends confidential survey links by email, tracked here only by participation status — never by answer.</p>

      <div className="mt-4">
        <SendAction state={sendState} sending={sending} onSend={sendSmart} />
      </div>

      {developerMode && sendState?.cycleStatus !== "closed" ? (
      <details className="mt-5 group">
        <summary className="cursor-pointer select-none text-[12px] font-medium text-[var(--ink-faint)] hover:text-[var(--ink-mid)]">Developer / test mode</summary>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
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
      </details>
      ) : null}
    </Card>
  );
}

function SendAction({ state, sending, onSend }: { state: SendState | null; sending: boolean; onSend: (deliveryType: "invite" | "reminder") => void }) {
  if (!state) return <InlineSpinnerRow label="Loading" />;

  if (state.cycleStatus === "closed") {
    return <p className="secondary-text font-medium">Survey closed — no further sending</p>;
  }
  if (state.issued === 0) {
    return <p className="secondary-text">No participants yet — upload employees to issue survey tokens.</p>;
  }
  if (state.issued === state.spent) {
    return <p className="secondary-text font-medium text-[var(--green)]">Everyone has responded</p>;
  }

  const notResponded = state.issued - state.spent;
  if (state.sentInvites === 0) {
    return (
      <button onClick={() => onSend("invite")} disabled={sending} className="btn-primary btn-pill">
        <Send size={14} strokeWidth={1.8} />
        {sending ? "Sending..." : `Send invites to ${notResponded} ${notResponded === 1 ? "person" : "people"}`}
      </button>
    );
  }
  return (
    <button onClick={() => onSend("reminder")} disabled={sending} className="btn-primary btn-pill">
      <Send size={14} strokeWidth={1.8} />
      {sending ? "Sending..." : `Remind ${notResponded} ${notResponded === 1 ? "person" : "people"} who haven't responded`}
    </button>
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

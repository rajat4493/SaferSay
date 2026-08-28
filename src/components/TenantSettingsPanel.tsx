"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { SkeletonCard } from "@/components/Skeleton";
import { useToast } from "@/components/ToastProvider";
import { useTenantSession } from "@/lib/useTenantSession";
import { surveyTemplates } from "@/lib/templates";

type ActionMode = "insights_only" | "tracked" | "tracked_with_rollup";

type Settings = {
  minGroupSize: number;
  dataResidencyRegion: string;
  planTier: string;
  features: Record<string, boolean>;
  safetyContactEmail: string | null;
  smtpConfigured: boolean;
  smtpFromEmail: string | null;
  slackConnected: boolean;
  actionMode: ActionMode;
};

type ApiKey = { id: string; label: string | null; createdAt: string; revokedAt: string | null };
type Recurrence = { id: string; templateSlug: string; interval: "weekly" | "monthly" | "quarterly"; autoSend: boolean; nextRunAt: string; disabled: boolean };

const featureLabels: Record<string, string> = {
  customQuestions: "Custom question editing",
  csvManagerHierarchy: "Manager hierarchy import",
  brandStudio: "Custom workspace branding",
};

export function TenantSettingsPanel() {
  const [settings, setSettings] = useState<Settings | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  // Tracks the slider's own visual position while dragging, separate from
  // the last-saved `settings.minGroupSize` -- React binds a range input's
  // onChange to the native `input` event, which fires on every step of a
  // drag, not just on release. Committing the PATCH (and its audit-log
  // write) on every one of those would spam the server; this only sends
  // the request once, when the drag/keypress actually ends.
  const [sliderValue, setSliderValue] = useState<number | null>(null);
  // Same "draft until saved, then fall back to fresh settings" pattern as
  // sliderValue -- this is a plain text field though, so it commits on an
  // explicit Save click, not a drag-release.
  const [savingActionMode, setSavingActionMode] = useState(false);
  const [safetyContactDraft, setSafetyContactDraft] = useState<string | null>(null);
  const [savingSafetyContact, setSavingSafetyContact] = useState(false);
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpFromEmail, setSmtpFromEmail] = useState("");
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [savingSlack, setSavingSlack] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newApiKeyLabel, setNewApiKeyLabel] = useState("");
  const [createdApiKey, setCreatedApiKey] = useState("");
  const [creatingApiKey, setCreatingApiKey] = useState(false);
  const [requestingDeletion, setRequestingDeletion] = useState(false);
  const [deletionRequested, setDeletionRequested] = useState(false);
  const [deletionRequestedAt, setDeletionRequestedAt] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [recurrences, setRecurrences] = useState<Recurrence[]>([]);
  const [newRecurrenceTemplate, setNewRecurrenceTemplate] = useState(surveyTemplates[0]?.slug ?? "");
  const [newRecurrenceInterval, setNewRecurrenceInterval] = useState<Recurrence["interval"]>("monthly");
  const [newRecurrenceAutoSend, setNewRecurrenceAutoSend] = useState(false);
  const [creatingRecurrence, setCreatingRecurrence] = useState(false);
  const toast = useToast();
  const { info: sessionInfo } = useTenantSession();

  function load() {
    fetch("/api/tenants/settings")
      .then((response) => response.json())
      .then((data) => setSettings(data.ok ? data.settings : null))
      .catch(() => setSettings(null));
  }

  function loadApiKeys() {
    fetch("/api/tenants/api-keys")
      .then((response) => response.json())
      .then((data: { ok?: boolean; keys?: ApiKey[] }) => setApiKeys(data.ok ? (data.keys ?? []) : []))
      .catch(() => setApiKeys([]));
  }

  function loadRecurrences() {
    fetch("/api/recurrences")
      .then((response) => response.json())
      .then((data: { ok?: boolean; recurrences?: Recurrence[] }) => setRecurrences(data.ok ? (data.recurrences ?? []) : []))
      .catch(() => setRecurrences([]));
  }

  useEffect(load, []);
  useEffect(loadApiKeys, []);
  useEffect(loadRecurrences, []);

  async function saveName() {
    const name = (nameDraft ?? "").trim();
    if (!name) return;
    setSavingName(true);
    const response = await fetch("/api/account", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    setSavingName(false);
    if (data.ok) {
      toast.show({ variant: "success", message: "Name updated." });
      setNameDraft(null);
      // Full reload keeps this in sync with every other place the signed-in
      // user's name is shown (AppShell's account card) without threading a
      // refetch callback through useTenantSession.
      window.location.reload();
    } else {
      toast.show({ variant: "error", message: data.error ?? "Couldn't update your name." });
    }
  }

  async function saveSmtp() {
    setSavingSmtp(true);
    const response = await fetch("/api/tenants/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        smtpHost,
        smtpPort: Number(smtpPort),
        smtpUsername,
        smtpPassword,
        smtpFromEmail,
      }),
    });
    const data = await response.json().catch(() => ({ ok: false }));
    setSavingSmtp(false);
    if (data.ok) {
      setSettings(data.settings);
      setSmtpHost("");
      setSmtpPort("");
      setSmtpUsername("");
      setSmtpPassword("");
      setSmtpFromEmail("");
      toast.show({ variant: "success", message: "Your mail server is now used for invite and reminder emails." });
    } else {
      toast.show({ variant: "error", message: data.error ?? "Couldn't save SMTP settings." });
    }
  }

  async function clearSmtp() {
    setSavingSmtp(true);
    const response = await fetch("/api/tenants/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ smtpClear: true }),
    });
    const data = await response.json().catch(() => ({ ok: false }));
    setSavingSmtp(false);
    if (data.ok) {
      setSettings(data.settings);
      toast.show({ variant: "success", message: "Removed. Invite and reminder emails will send from SaferSay again." });
    }
  }

  async function saveSlack() {
    setSavingSlack(true);
    const response = await fetch("/api/tenants/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slackWebhookUrl }),
    });
    const data = await response.json().catch(() => ({ ok: false }));
    setSavingSlack(false);
    if (data.ok) {
      setSettings(data.settings);
      setSlackWebhookUrl("");
      toast.show({ variant: "success", message: "Slack connected. Team updates can now be shared to your channel." });
    } else {
      toast.show({ variant: "error", message: data.error ?? "Couldn't connect Slack." });
    }
  }

  async function clearSlack() {
    setSavingSlack(true);
    const response = await fetch("/api/tenants/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slackClear: true }),
    });
    const data = await response.json().catch(() => ({ ok: false }));
    setSavingSlack(false);
    if (data.ok) {
      setSettings(data.settings);
      toast.show({ variant: "success", message: "Disconnected Slack." });
    }
  }

  async function createApiKey() {
    setCreatingApiKey(true);
    setCreatedApiKey("");
    const response = await fetch("/api/tenants/api-keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label: newApiKeyLabel.trim() || undefined }),
    });
    const data = (await response.json().catch(() => ({}))) as { ok?: boolean; key?: string };
    setCreatingApiKey(false);
    if (data.ok && data.key) {
      setCreatedApiKey(data.key);
      setNewApiKeyLabel("");
      loadApiKeys();
    }
  }

  async function revokeApiKey(id: string) {
    await fetch(`/api/tenants/api-keys?id=${id}`, { method: "DELETE" });
    loadApiKeys();
  }

  async function createRecurrence() {
    setCreatingRecurrence(true);
    const response = await fetch("/api/recurrences", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ templateSlug: newRecurrenceTemplate, interval: newRecurrenceInterval, autoSend: newRecurrenceAutoSend }),
    });
    const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    setCreatingRecurrence(false);
    if (data.ok) {
      loadRecurrences();
      toast.show({ variant: "success", message: "Recurring survey scheduled." });
    } else {
      toast.show({ variant: "error", message: data.error ?? "Couldn't schedule that survey." });
    }
  }

  async function cancelRecurrence(id: string) {
    await fetch(`/api/recurrences/${id}`, { method: "DELETE" });
    loadRecurrences();
  }

  async function commitMinGroupSize() {
    if (sliderValue === null || !settings || sliderValue === settings.minGroupSize) return;
    const value = sliderValue;
    setSaving(true);
    const response = await fetch("/api/tenants/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ minGroupSize: value }),
    });
    const data = await response.json().catch(() => ({ ok: false }));
    setSaving(false);
    setSliderValue(null);
    if (data.ok) {
      setSettings(data.settings);
      toast.show({ variant: "success", message: `Minimum group size set to ${data.settings.minGroupSize}.` });
    } else {
      toast.show({ variant: "error", message: "Couldn't save that setting. Try again." });
    }
  }

  async function saveActionMode(mode: ActionMode) {
    setSavingActionMode(true);
    const response = await fetch("/api/tenants/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ actionMode: mode }),
    });
    const data = await response.json().catch(() => ({ ok: false }));
    setSavingActionMode(false);
    if (data.ok) {
      setSettings(data.settings);
      toast.show({ variant: "success", message: "Action-tracking mode updated." });
    } else {
      toast.show({ variant: "error", message: "Couldn't save that setting. Try again." });
    }
  }

  async function saveSafetyContact() {
    if (safetyContactDraft === null) return;
    setSavingSafetyContact(true);
    const response = await fetch("/api/tenants/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ safetyContactEmail: safetyContactDraft }),
    });
    const data = await response.json().catch(() => ({ ok: false }));
    setSavingSafetyContact(false);
    if (data.ok) {
      setSettings(data.settings);
      setSafetyContactDraft(null);
      toast.show({
        variant: "success",
        message: data.settings.safetyContactEmail ? "Safety contact saved." : "Safety contact removed -- the SOS button is now hidden for respondents.",
      });
    } else {
      toast.show({ variant: "error", message: data.error ?? "Couldn't save that setting. Try again." });
    }
  }

  function exportEmployeesCsv() {
    fetch("/api/employees?limit=10000")
      .then((response) => response.json())
      .then((data) => {
        if (!data.ok) return;
        const rows = [
          ["Email", "Name", "Team", "Location", "Status"],
          ...data.employees.map((e: { email: string; name: string | null; team: string | null; location: string | null; employmentStatus: string }) => [
            e.email,
            e.name ?? "",
            e.team ?? "",
            e.location ?? "",
            e.employmentStatus,
          ]),
        ];
        const csv = rows.map((row) => row.map((cell: string) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "safersay-employees.csv";
        link.click();
        URL.revokeObjectURL(url);
      });
  }

  function exportWorkspaceJson() {
    fetch("/api/tenants/export")
      .then((response) => response.json())
      .then((data) => {
        if (!data.ok) return;
        const blob = new Blob([JSON.stringify(data.export, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "safersay-workspace-export.json";
        link.click();
        URL.revokeObjectURL(url);
      });
  }

  async function requestDeletion() {
    const confirmed = window.confirm(
      "Request deletion for this workspace? This records your request now. Deletion is irreversible and will be confirmed with you by email before it is carried out.",
    );
    if (!confirmed) return;

    setRequestingDeletion(true);
    const response = await fetch("/api/tenants/deletion-request", { method: "POST" });
    const data = await response.json().catch(() => ({ ok: false })) as { ok?: boolean; requestedAt?: string; error?: string };
    setRequestingDeletion(false);
    if (data.ok) {
      setDeletionRequested(true);
      setDeletionRequestedAt(data.requestedAt ?? new Date().toISOString());
      toast.show({ variant: "success", message: "Deletion request recorded. We'll confirm the deletion steps by email." });
    } else {
      toast.show({ variant: "error", message: data.error ?? "Couldn't log that request. Try again." });
    }
  }

  if (settings === undefined) {
    return (
      <div className="space-y-[9px]">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }
  if (settings === null) return <p className="secondary-text">Couldn&apos;t load settings.</p>;

  return (
    <div className="space-y-[9px]">
      <Card>
        <h2 className="section-title">Your account</h2>
        <p className="mt-1.5 secondary-text">The display name shown to your teammates in this workspace.</p>
        <div className="mt-4 flex items-center gap-3">
          <Avatar label={nameDraft ?? sessionInfo?.userName ?? sessionInfo?.userEmail ?? "?"} />
          <input
            value={nameDraft ?? sessionInfo?.userName ?? ""}
            onChange={(event) => setNameDraft(event.target.value)}
            placeholder={sessionInfo?.userEmail ?? "Your name"}
            aria-label="Display name"
            className="admin-input max-w-xs"
          />
          <button
            onClick={saveName}
            disabled={savingName || nameDraft === null || nameDraft.trim() === (sessionInfo?.userName ?? "")}
            className="btn-secondary"
          >
            {savingName ? "Saving..." : "Save"}
          </button>
        </div>
      </Card>

      <Card>
        <h2 className="section-title">Confidentiality threshold</h2>
        <p className="mt-1.5 secondary-text">
          The minimum number of responses required before any group&apos;s results unlock. You can tune this within a safe range, but it
          can never go below 3 — that&apos;s the point at which &quot;confidential&quot; stops meaning anything.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <input
            type="range"
            min={3}
            max={10}
            value={sliderValue ?? settings.minGroupSize}
            disabled={saving}
            onChange={(event) => setSliderValue(Number(event.target.value))}
            onMouseUp={commitMinGroupSize}
            onTouchEnd={commitMinGroupSize}
            onKeyUp={commitMinGroupSize}
            className="flex-1"
          />
          <span className="data-number w-10 text-[16px]">{sliderValue ?? settings.minGroupSize}</span>
        </div>
      </Card>

      <Card>
        <h2 className="section-title">Recognize, recommend, act</h2>
        <p className="mt-1.5 secondary-text">
          Every report already includes free recognition and recommendations -- this only controls whether you can turn one into a
          tracked, dated commitment. Nothing here is enforcement: a stale commitment is only ever visible to you.
        </p>
        <div className="mt-4 grid gap-2">
          {(
            [
              { value: "insights_only" as const, label: "Insights only", description: "Recommendations, no tracking. Today's behavior." },
              { value: "tracked" as const, label: "Track commitments", description: "Turn a recommendation into a commitment with a status and progress updates." },
              { value: "tracked_with_rollup" as const, label: "Track + show me the rollup", description: "Also adds an org-wide view of every commitment's status across surveys, visible only to you." },
            ]
          ).map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-input)] border p-3 ${settings.actionMode === option.value ? "border-[var(--ink)] bg-[var(--bg)]" : "border-[var(--border)]"}`}
            >
              <input
                type="radio"
                name="actionMode"
                checked={settings.actionMode === option.value}
                disabled={savingActionMode}
                onChange={() => saveActionMode(option.value)}
                className="mt-1"
              />
              <span>
                <span className="block text-[13px] font-medium text-[var(--ink)]">{option.label}</span>
                <span className="block text-[12px] text-[var(--ink-soft)]">{option.description}</span>
              </span>
            </label>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="section-title">Safety contact</h2>
        <p className="mt-1.5 secondary-text">
          Where a survey-taker&apos;s &quot;I need help&quot; message goes if they choose to identify themselves for a safety concern
          (e.g. harassment) -- separate from the anonymous survey, never included in aggregate reports.{" "}
          <strong className="text-[var(--ink)]">
            Don&apos;t use your own address, or anyone who might be the subject of a report -- pick someone a survey-taker could
            safely report about anyone else to.
          </strong>{" "}
          The &quot;I need help&quot; button won&apos;t appear for respondents until this is set.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            value={safetyContactDraft ?? settings.safetyContactEmail ?? ""}
            onChange={(event) => setSafetyContactDraft(event.target.value)}
            placeholder="hr@yourcompany.com"
            aria-label="Safety contact email"
            disabled={savingSafetyContact}
            className="admin-input flex-1"
          />
          <button onClick={saveSafetyContact} disabled={savingSafetyContact || safetyContactDraft === null} className="btn-primary shrink-0">
            {savingSafetyContact ? "Saving..." : "Save"}
          </button>
        </div>
      </Card>

      <Card>
        <h2 className="section-title">Outbound mail server</h2>
        <p className="mt-1.5 secondary-text">
          {settings.smtpConfigured
            ? `Invite and reminder emails currently send from your own server (${settings.smtpFromEmail}).`
            : "Invite and reminder emails currently send from SaferSay's shared address. Add your own SMTP server to send from your own domain instead."}
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.yourcompany.com" aria-label="SMTP host" className="admin-input" />
          <input value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} placeholder="587" aria-label="SMTP port" className="admin-input" />
          <input value={smtpUsername} onChange={(e) => setSmtpUsername(e.target.value)} placeholder="Username" aria-label="SMTP username" className="admin-input" />
          <input type="password" value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)} placeholder="Password" aria-label="SMTP password" className="admin-input" />
          <input
            type="email"
            value={smtpFromEmail}
            onChange={(e) => setSmtpFromEmail(e.target.value)}
            placeholder="surveys@yourcompany.com"
            aria-label="SMTP from address"
            className="admin-input sm:col-span-2"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={saveSmtp} disabled={savingSmtp || !smtpHost.trim()} className="btn-primary">
            {savingSmtp ? "Saving..." : "Save mail server"}
          </button>
          {settings.smtpConfigured ? (
            <button onClick={clearSmtp} disabled={savingSmtp} className="btn-secondary">
              Use SaferSay&apos;s address instead
            </button>
          ) : null}
        </div>
      </Card>

      <Card>
        <h2 className="section-title">Slack</h2>
        <p className="mt-1.5 secondary-text">
          {settings.slackConnected
            ? "Slack is connected. Team updates can be posted to your channel from the update-drafting page."
            : "Connect a Slack incoming webhook to share team updates directly to a channel, instead of copying them as email."}
        </p>
        {settings.slackConnected ? (
          <div className="mt-3">
            <button onClick={clearSlack} disabled={savingSlack} className="btn-secondary">
              Disconnect Slack
            </button>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <input
              value={slackWebhookUrl}
              onChange={(e) => setSlackWebhookUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              aria-label="Slack incoming webhook URL"
              className="admin-input flex-1"
            />
            <button onClick={saveSlack} disabled={savingSlack || !slackWebhookUrl.trim()} className="btn-primary shrink-0">
              {savingSlack ? "Connecting..." : "Connect Slack"}
            </button>
          </div>
        )}
        <p className="mt-2 text-xs text-[var(--ink-faint)]">
          Create one at{" "}
          <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noreferrer" className="underline">
            api.slack.com/messaging/webhooks
          </a>{" "}
          for the channel you want updates posted to.
        </p>
      </Card>

      <Card>
        <h2 className="section-title">Recurring surveys</h2>
        <p className="mt-1.5 secondary-text">Automatically create a new survey from a template on a schedule, instead of starting each one by hand.</p>

        <div className="mt-4 flex flex-wrap items-end gap-2">
          <select value={newRecurrenceTemplate} onChange={(e) => setNewRecurrenceTemplate(e.target.value)} aria-label="Template to recur" className="admin-input h-9 w-auto">
            {surveyTemplates.map((template) => (
              <option key={template.slug} value={template.slug}>
                {template.name}
              </option>
            ))}
          </select>
          <select value={newRecurrenceInterval} onChange={(e) => setNewRecurrenceInterval(e.target.value as Recurrence["interval"])} aria-label="Recurrence interval" className="admin-input h-9 w-auto">
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
          <label className="flex h-9 items-center gap-1.5 text-[13px] text-[var(--ink-mid)]">
            <input type="checkbox" checked={newRecurrenceAutoSend} onChange={(e) => setNewRecurrenceAutoSend(e.target.checked)} />
            Send automatically
          </label>
          <button onClick={createRecurrence} disabled={creatingRecurrence} className="btn-primary h-9">
            {creatingRecurrence ? "Scheduling..." : "Schedule"}
          </button>
        </div>

        {recurrences.length > 0 ? (
          <div className="mt-4 space-y-1.5">
            {recurrences.map((recurrence) => (
              <div key={recurrence.id} className="flex items-center justify-between rounded-[var(--radius-input)] border border-[var(--border)] bg-white p-2.5 text-[13px]">
                <span>
                  {surveyTemplates.find((t) => t.slug === recurrence.templateSlug)?.name ?? recurrence.templateSlug} · {recurrence.interval}
                  {recurrence.autoSend ? " · sends automatically" : " · created as draft"}
                </span>
                <button onClick={() => cancelRecurrence(recurrence.id)} className="text-xs font-medium text-[var(--red)] hover:underline">
                  Cancel
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </Card>

      <Card>
        <h2 className="section-title">API keys</h2>
        <p className="mt-1.5 secondary-text">
          For pulling report data into PowerBI, Tableau, or a ChatGPT connector. Same k-anonymity protection as the app -- a key can
          never see anything below your confidentiality threshold.
        </p>
        {createdApiKey ? (
          <div className="mt-3 rounded-[var(--radius-input)] border border-[var(--green-border)] bg-[var(--green-bg)] p-3 text-[13px]">
            <p className="font-medium text-[var(--ink)]">Copy this now -- it won&apos;t be shown again:</p>
            <code className="mt-1 block break-all">{createdApiKey}</code>
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={newApiKeyLabel}
            onChange={(e) => setNewApiKeyLabel(e.target.value)}
            placeholder="Label (optional, e.g. PowerBI)"
            aria-label="API key label"
            className="admin-input flex-1"
          />
          <button onClick={createApiKey} disabled={creatingApiKey} className="btn-primary shrink-0">
            {creatingApiKey ? "Creating..." : "Create key"}
          </button>
        </div>
        {apiKeys.filter((key) => !key.revokedAt).length > 0 ? (
          <div className="mt-3 space-y-1.5">
            {apiKeys
              .filter((key) => !key.revokedAt)
              .map((key) => (
                <div key={key.id} className="flex items-center justify-between rounded-[var(--radius-input)] border border-[var(--border)] px-3 py-2 text-[13px]">
                  <span className="text-[var(--ink)]">{key.label || "Unlabeled key"}</span>
                  <button onClick={() => revokeApiKey(key.id)} className="text-xs font-medium text-[var(--red)] hover:underline">
                    Revoke
                  </button>
                </div>
              ))}
          </div>
        ) : null}
      </Card>

      <Card>
        <h2 className="section-title">Plan &amp; features</h2>
        <p className="mt-1.5 secondary-text capitalize">
          Current plan: <span className="font-semibold text-[var(--ink)]">{settings.planTier}</span>
        </p>
        <div className="mt-3 space-y-1.5 text-[13px]">
          {Object.entries(featureLabels).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between rounded-[var(--radius-input)] border border-[var(--border)] px-3 py-2 text-[var(--ink)]">
              {label}
              <span className={`text-xs font-semibold ${settings.features[key] ? "text-[var(--green)]" : "text-[var(--ink-faint)]"}`}>
                {settings.features[key] ? "Included" : "Not included"}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-[var(--ink-faint)]">To change your plan or feature set, contact SaferSay — this is set by your account, not editable here.</p>
      </Card>

      <Card>
        <h2 className="section-title">Branding</h2>
        <p className="mt-1.5 secondary-text">Workspace name, tagline, and logo live in Brand.</p>
        <Link href="/app/brand" className="btn-secondary btn-pill mt-3">
          Open Brand
        </Link>
      </Card>

      <Card>
        <h2 className="section-title">Data export &amp; deletion</h2>
        <p className="mt-1.5 secondary-text">Your data is always exportable, never held hostage. Report exports are available from the Results tab once unlocked.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={exportEmployeesCsv} className="btn-secondary btn-pill">
            Export employee list (CSV)
          </button>
          <button onClick={exportWorkspaceJson} className="btn-secondary btn-pill">
            Export full workspace data (JSON)
          </button>
          {deletionRequested ? (
            <span className="btn-secondary btn-pill cursor-default opacity-70">
              Deletion requested{deletionRequestedAt ? ` ${new Date(deletionRequestedAt).toLocaleDateString()}` : ""}
            </span>
          ) : (
            <button onClick={requestDeletion} disabled={requestingDeletion} className="btn-secondary btn-pill">
              {requestingDeletion ? "Logging request..." : "Request account deletion"}
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-[var(--ink-faint)]">
          Requesting deletion requires confirmation and logs a dated receipt to your workspace&apos;s audit trail.
          Actual deletion is a manual step we confirm with you by email first, since it can&apos;t be undone. You can also reach us
          directly at <a href="mailto:privacy@safersay.com" className="underline">privacy@safersay.com</a>.
        </p>
      </Card>
    </div>
  );
}

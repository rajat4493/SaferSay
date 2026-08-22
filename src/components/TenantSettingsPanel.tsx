"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { SkeletonCard } from "@/components/Skeleton";
import { useToast } from "@/components/ToastProvider";
import { useTenantSession } from "@/lib/useTenantSession";

type Settings = {
  minGroupSize: number;
  dataResidencyRegion: string;
  planTier: string;
  features: Record<string, boolean>;
  safetyContactEmail: string | null;
  smtpConfigured: boolean;
  smtpFromEmail: string | null;
};

type ApiKey = { id: string; label: string | null; createdAt: string; revokedAt: string | null };

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
  const [safetyContactDraft, setSafetyContactDraft] = useState<string | null>(null);
  const [savingSafetyContact, setSavingSafetyContact] = useState(false);
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpFromEmail, setSmtpFromEmail] = useState("");
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newApiKeyLabel, setNewApiKeyLabel] = useState("");
  const [createdApiKey, setCreatedApiKey] = useState("");
  const [creatingApiKey, setCreatingApiKey] = useState(false);
  const [requestingDeletion, setRequestingDeletion] = useState(false);
  const [deletionRequested, setDeletionRequested] = useState(false);
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
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

  useEffect(load, []);
  useEffect(loadApiKeys, []);

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
    setRequestingDeletion(true);
    const response = await fetch("/api/tenants/deletion-request", { method: "POST" });
    const data = await response.json().catch(() => ({ ok: false }));
    setRequestingDeletion(false);
    if (data.ok) {
      setDeletionRequested(true);
      toast.show({ variant: "success", message: "Deletion request logged. We'll follow up by email." });
    } else {
      toast.show({ variant: "error", message: "Couldn't log that request. Try again." });
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
            <span className="btn-secondary btn-pill cursor-default opacity-70">Deletion requested -- we&apos;ll follow up by email</span>
          ) : (
            <button onClick={requestDeletion} disabled={requestingDeletion} className="btn-secondary btn-pill">
              {requestingDeletion ? "Logging request..." : "Request account deletion"}
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-[var(--ink-faint)]">
          Requesting deletion logs it to your workspace&apos;s audit trail immediately -- actual deletion is a
          manual step we confirm with you by email first, since it can&apos;t be undone. You can also reach us
          directly at <a href="mailto:privacy@safersay.com" className="underline">privacy@safersay.com</a>.
        </p>
      </Card>
    </div>
  );
}

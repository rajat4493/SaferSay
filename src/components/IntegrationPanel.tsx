"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/AppShell";
import { useToast } from "@/components/ToastProvider";

type Settings = { smtpConfigured: boolean; smtpFromEmail: string | null; slackConnected: boolean };
type SsoConfig = { domain: string | null; metadataUrl: string | null; hasMetadataXml: boolean; providerId: string | null; enabled: boolean };

export function IntegrationPanel() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [smtp, setSmtp] = useState({ host: "", port: "", username: "", password: "", fromEmail: "" });
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [sso, setSso] = useState<SsoConfig | null>(null);
  const [ssoForm, setSsoForm] = useState({ domain: "", metadataUrl: "", metadataXml: "" });
  const [saving, setSaving] = useState<"smtp" | "slack" | "sso" | "" >("");
  const toast = useToast();
  const load = () => fetch("/api/tenants/integrations").then((r) => r.json()).then((data) => setSettings(data.ok ? data.settings : null)).catch(() => setSettings(null));
  const loadSso = () => fetch("/api/tenants/sso").then((r) => r.json()).then((data) => setSso(data.ok ? data.sso : null)).catch(() => setSso(null));
  useEffect(() => {
    void load();
    void loadSso();
  }, []);

  async function patch(kind: "smtp" | "slack", body: Record<string, unknown>) {
    setSaving(kind);
    const response = await fetch("/api/tenants/integrations", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    setSaving("");
    if (data.ok) { setSettings(data.settings); toast.show({ variant: "success", message: "Integration updated." }); }
    else toast.show({ variant: "error", message: data.error ?? "Couldn't update the integration." });
  }

  async function connectSso() {
    setSaving("sso");
    const response = await fetch("/api/tenants/sso", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ domain: ssoForm.domain, metadataUrl: ssoForm.metadataUrl, metadataXml: ssoForm.metadataXml }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving("");
    if (data.ok) { setSso(data.sso); setSsoForm({ domain: "", metadataUrl: "", metadataXml: "" }); toast.show({ variant: "success", message: "SSO connected." }); }
    else toast.show({ variant: "error", message: data.error ?? "Couldn't connect SSO." });
  }

  async function disconnectSso() {
    setSaving("sso");
    const response = await fetch("/api/tenants/sso", { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    setSaving("");
    if (data.ok) { setSso({ domain: null, metadataUrl: null, hasMetadataXml: false, providerId: null, enabled: false }); toast.show({ variant: "success", message: "SSO disconnected." }); }
    else toast.show({ variant: "error", message: data.error ?? "Couldn't disconnect SSO." });
  }

  return <div className="space-y-3">
    <Card>
      <h2 className="section-title">Technical integrations</h2>
      <p className="mt-1 secondary-text">This area never exposes surveys, employee sentiment, comments, reports, billing, or privacy settings.</p>
    </Card>
    <Card>
      <h2 className="section-title">Email delivery</h2>
      <p className="mt-1 secondary-text">{settings?.smtpConfigured ? `Connected${settings.smtpFromEmail ? ` as ${settings.smtpFromEmail}` : ""}.` : "Using SaferSay's default delivery service."}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input className="admin-input" placeholder="SMTP host" value={smtp.host} onChange={(e) => setSmtp({ ...smtp, host: e.target.value })} />
        <input className="admin-input" placeholder="Port" inputMode="numeric" value={smtp.port} onChange={(e) => setSmtp({ ...smtp, port: e.target.value })} />
        <input className="admin-input" placeholder="Username" value={smtp.username} onChange={(e) => setSmtp({ ...smtp, username: e.target.value })} />
        <input className="admin-input" placeholder="Password" type="password" value={smtp.password} onChange={(e) => setSmtp({ ...smtp, password: e.target.value })} />
        <input className="admin-input sm:col-span-2" placeholder="From address" value={smtp.fromEmail} onChange={(e) => setSmtp({ ...smtp, fromEmail: e.target.value })} />
      </div>
      <div className="mt-3 flex gap-2"><button className="btn-primary" disabled={saving === "smtp"} onClick={() => patch("smtp", { smtpHost: smtp.host, smtpPort: Number(smtp.port), smtpUsername: smtp.username, smtpPassword: smtp.password, smtpFromEmail: smtp.fromEmail })}>{saving === "smtp" ? "Saving..." : "Save email delivery"}</button>{settings?.smtpConfigured ? <button className="btn-secondary" onClick={() => patch("smtp", { smtpClear: true })}>Disconnect</button> : null}</div>
    </Card>
    <Card>
      <h2 className="section-title">Slack</h2>
      <p className="mt-1 secondary-text">{settings?.slackConnected ? "Connected for approved survey updates." : "Connect an incoming webhook for approved survey updates."}</p>
      <input className="admin-input mt-3 w-full" placeholder="https://hooks.slack.com/services/..." value={slackWebhookUrl} onChange={(e) => setSlackWebhookUrl(e.target.value)} />
      <div className="mt-3 flex gap-2"><button className="btn-primary" disabled={saving === "slack"} onClick={() => patch("slack", { slackWebhookUrl })}>{saving === "slack" ? "Saving..." : "Connect Slack"}</button>{settings?.slackConnected ? <button className="btn-secondary" onClick={() => patch("slack", { slackClear: true })}>Disconnect</button> : null}</div>
    </Card>
    <Card>
      <h2 className="section-title">Single sign-on (SSO)</h2>
      <p className="mt-1 secondary-text">
        {sso?.enabled
          ? `Connected for ${sso.domain}. Team members with a ${sso.domain} email can sign in with your identity provider.`
          : "Let your team sign in with your company's identity provider instead of Google or Microsoft. Survey participants never use this -- they always sign in with their unique survey link, no account needed."}
      </p>
      {!sso?.enabled ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input className="admin-input" placeholder="Company domain, e.g. acme.com" value={ssoForm.domain} onChange={(e) => setSsoForm({ ...ssoForm, domain: e.target.value })} />
          <input className="admin-input" placeholder="IdP metadata URL" value={ssoForm.metadataUrl} onChange={(e) => setSsoForm({ ...ssoForm, metadataUrl: e.target.value })} />
          <textarea className="admin-input sm:col-span-2" rows={3} placeholder="Or paste IdP metadata XML instead" value={ssoForm.metadataXml} onChange={(e) => setSsoForm({ ...ssoForm, metadataXml: e.target.value })} />
        </div>
      ) : null}
      <div className="mt-3 flex gap-2">
        {!sso?.enabled ? (
          <button className="btn-primary" disabled={saving === "sso"} onClick={connectSso}>{saving === "sso" ? "Connecting..." : "Connect SSO"}</button>
        ) : (
          <button className="btn-secondary" disabled={saving === "sso"} onClick={disconnectSso}>{saving === "sso" ? "Disconnecting..." : "Disconnect SSO"}</button>
        )}
      </div>
    </Card>
    <Card><h2 className="section-title">HRIS and API access</h2><p className="mt-1 secondary-text">These connections require owner-approved, scoped credentials. Broad API keys remain owner-controlled because they can export protected reports.</p></Card>
  </div>;
}

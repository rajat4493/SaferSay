"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/AppShell";
import { useToast } from "@/components/ToastProvider";

type Settings = { smtpConfigured: boolean; smtpFromEmail: string | null; slackConnected: boolean };

export function IntegrationPanel() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [smtp, setSmtp] = useState({ host: "", port: "", username: "", password: "", fromEmail: "" });
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [saving, setSaving] = useState<"smtp" | "slack" | "" >("");
  const toast = useToast();
  const load = () => fetch("/api/tenants/integrations").then((r) => r.json()).then((data) => setSettings(data.ok ? data.settings : null)).catch(() => setSettings(null));
  useEffect(() => {
    void load();
  }, []);

  async function patch(kind: "smtp" | "slack", body: Record<string, unknown>) {
    setSaving(kind);
    const response = await fetch("/api/tenants/integrations", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    setSaving("");
    if (data.ok) { setSettings(data.settings); toast.show({ variant: "success", message: "Integration updated." }); }
    else toast.show({ variant: "error", message: data.error ?? "Couldn't update the integration." });
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
    <Card><h2 className="section-title">HRIS, SSO and API access</h2><p className="mt-1 secondary-text">These connections require owner-approved, scoped credentials. Broad API keys remain owner-controlled because they can export protected reports.</p></Card>
  </div>;
}

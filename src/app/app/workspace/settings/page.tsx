import { AppShell } from "@/components/AppShell";
import { PageGuide } from "@/components/PageGuide";
import { TenantSettingsPanel } from "@/components/TenantSettingsPanel";

export default function WorkspaceSettingsPage() {
  return (
    <AppShell title="Settings" subtitle="Confidentiality threshold, branding, plan, and data controls for your workspace.">
      <PageGuide
        label="Workspace"
        title="Tune your confidentiality threshold and manage your data"
        body="This page never shows survey answers -- it configures the wall that protects them."
        actions={[{ href: "/app/workspace/security", label: "How confidentiality works" }]}
      />
      <div className="mt-5">
        <TenantSettingsPanel />
      </div>
    </AppShell>
  );
}

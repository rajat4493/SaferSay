import { AppShell } from "@/components/AppShell";
import { PageGuide } from "@/components/PageGuide";
import { TenantSettingsPanel } from "@/components/TenantSettingsPanel";

export default function WorkspaceSettingsPage() {
  return (
    <AppShell title="Settings" subtitle="Settings configure the wall, never breach it">
      <PageGuide
        label="Workspace"
        title="Tune your confidentiality threshold and manage your data"
        body="This page never shows survey answers -- it configures the wall that protects them."
        actions={[{ href: "/app/security-proof", label: "How confidentiality works" }]}
      />
      <div className="mt-[9px]">
        <TenantSettingsPanel />
      </div>
    </AppShell>
  );
}

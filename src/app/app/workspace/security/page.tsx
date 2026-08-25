import { AppShell, Card } from "@/components/AppShell";
import { ConfidentialitySeal } from "@/components/ConfidentialitySeal";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { securityControls } from "@/lib/securityControls";

const controls = securityControls;

export default function WorkspaceSecurityPage() {
  return (
    <AppShell
      title="How we protect your team's answers"
      subtitle="Plain-English explanation for HR leads, DPOs, and employee representatives."
    >
      <ConfidentialitySeal />
      <div className="mb-[9px]">
        <CopyLinkButton />
      </div>
      <div className="grid gap-2.5 md:grid-cols-2">
        {controls.map(([title, text]) => (
          <Card key={title}>
            <h2 className="section-title">{title}</h2>
            <p className="mt-2 secondary-text">{text}</p>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}

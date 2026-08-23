import { ViewerCard, ViewerShell } from "@/components/ViewerShell";

export default function TeamViewerPage() {
  return (
    <ViewerShell title="My Team" subtitle="Manager view. Results appear only when this exact team meets the confidentiality threshold.">
      <ViewerCard>
        <h2 className="text-xl font-semibold">Team report protected</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">This team does not yet meet the threshold. Results stay protected; SaferSay does not roll up teams automatically.</p>
      </ViewerCard>
    </ViewerShell>
  );
}

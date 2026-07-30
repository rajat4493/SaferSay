import { ViewerCard, ViewerShell } from "@/components/ViewerShell";

export default function TeamViewerPage() {
  return (
    <ViewerShell title="My Team" subtitle="Manager view. If the team has fewer than five responses, results roll up.">
      <ViewerCard>
        <h2 className="text-xl font-semibold">Team report protected</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">This demo team does not yet meet the threshold. The manager sees the roll-up instead of a small-cell report.</p>
      </ViewerCard>
    </ViewerShell>
  );
}

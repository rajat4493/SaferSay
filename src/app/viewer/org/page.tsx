import { ViewerCard, ViewerShell } from "@/components/ViewerShell";

export default function OrgViewerPage() {
  return (
    <ViewerShell title="Organisation View" subtitle="Company-level trends for executives. No participant list, no raw identities.">
      <div className="grid gap-4 md:grid-cols-2">
        <ViewerCard><h2 className="text-xl font-semibold">Engagement trend</h2><p className="mt-2 text-sm text-[var(--brand-muted)]">Trend unlocks after multiple cycles.</p></ViewerCard>
        <ViewerCard><h2 className="text-xl font-semibold">Protected segments</h2><p className="mt-2 text-sm text-[var(--brand-muted)]">Small departments roll up before rendering.</p></ViewerCard>
      </div>
    </ViewerShell>
  );
}

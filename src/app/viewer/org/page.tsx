import { CycleTrendPanel } from "@/components/CycleTrendPanel";
import { ViewerCard, ViewerShell } from "@/components/ViewerShell";

export default function OrgViewerPage() {
  return (
    <ViewerShell title="Organisation View" subtitle="Company-level trends for executives. No participant list, no raw identities.">
      <div className="grid gap-4 md:grid-cols-2">
        <CycleTrendPanel mode="viewer" />
        <ViewerCard><h2 className="text-xl font-semibold">Protected segments</h2><p className="mt-2 text-sm text-[var(--brand-muted)]">Small departments are suppressed and never widened automatically.</p></ViewerCard>
      </div>
    </ViewerShell>
  );
}

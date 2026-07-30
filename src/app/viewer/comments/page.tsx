import { ViewerCard, ViewerShell } from "@/components/ViewerShell";

export default function CommentsViewerPage() {
  return (
    <ViewerShell title="Comments" subtitle="Open text is higher risk, so it is guarded more carefully.">
      <ViewerCard>
        <h2 className="text-xl font-semibold">No comments visible yet</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">Comments render only when the relevant population is threshold-safe and the report owner has viewer permission.</p>
      </ViewerCard>
    </ViewerShell>
  );
}

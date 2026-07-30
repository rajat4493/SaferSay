import { ViewerCard, ViewerShell } from "@/components/ViewerShell";

export default function ActionsViewerPage() {
  return (
    <ViewerShell title="Actions" subtitle="The closing-the-loop space for leaders and HRBPs.">
      <ViewerCard>
        <h2 className="text-xl font-semibold">Commit to one change</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">We heard workload needs attention. This month we will clarify priorities and remove one recurring meeting.</p>
        <button className="mt-5 rounded-full bg-[var(--brand-accent)] px-5 py-3 text-sm font-semibold text-white">Mark shared with team</button>
      </ViewerCard>
    </ViewerShell>
  );
}

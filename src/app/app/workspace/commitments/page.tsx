"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { AppShell, Card } from "@/components/AppShell";
import { PageGuide } from "@/components/PageGuide";

type RollupItem = {
  id: string; cycleId: string; cycleName: string; statement: string; targetDate: string;
  status: "published" | "in_progress" | "completed"; progressUpdate: string | null; source: "manual" | "insight"; stale: boolean;
};

const STATUS_LABEL: Record<RollupItem["status"], string> = { published: "Not started", in_progress: "In progress", completed: "Completed" };

/**
 * Org-wide "which commitments are on track" -- opted into via Settings'
 * action_mode, customer_admin only. This is visibility the workspace
 * owner chose for themselves, not a mechanism for watching anyone's team:
 * nothing here identifies who made a commitment beyond "this workspace,"
 * and there's no notification, escalation, or consequence wired to it --
 * just a status list.
 */
export default function CommitmentsRollupPage() {
  const [items, setItems] = useState<RollupItem[] | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/tenants/commitments/rollup")
      .then((response) => response.json().then((data) => ({ status: response.status, data })))
      .then(({ data }: { data: { ok?: boolean; commitments?: RollupItem[]; error?: string; rollupDisabled?: boolean } }) => {
        if (data.ok) setItems(data.commitments ?? []);
        else if (data.rollupDisabled) setDisabled(true);
        else setError(data.error ?? "Couldn't load the commitment rollup.");
      })
      .catch(() => setError("Couldn't load the commitment rollup."));
  }, []);

  return (
    <AppShell title="Commitments" subtitle="Every tracked commitment, across every survey, in one place.">
      <PageGuide
        label="Workspace"
        title="A rollup of what you've committed to and where it stands"
        body="Only you see this. It's a status list, not a scorecard -- nothing here notifies or escalates on its own."
        actions={[{ href: "/app/surveys", label: "Back to surveys" }]}
      />
      <div className="mt-[9px]">
        {disabled ? (
          <Card>
            <h2 className="section-title">Rollup not turned on</h2>
            <p className="mt-2 secondary-text">
              Turn on &quot;Track + show me the rollup&quot; in{" "}
              <Link href="/app/workspace/settings" className="font-medium text-[var(--ink)] underline">
                Settings
              </Link>{" "}
              to see this view.
            </p>
          </Card>
        ) : error ? (
          <Card>
            <p className="secondary-text">{error}</p>
          </Card>
        ) : items === null ? (
          <Card>
            <p className="secondary-text">Loading...</p>
          </Card>
        ) : items.length === 0 ? (
          <Card>
            <h2 className="section-title">No commitments yet</h2>
            <p className="mt-2 secondary-text">Publish a commitment from any survey&apos;s Results page and it will show up here.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <Card key={item.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-[var(--ink)]">{item.statement}</p>
                    <p className="mt-1 text-xs text-[var(--ink-faint)]">
                      <Link href={`/app/${item.cycleId}/results`} className="underline hover:text-[var(--ink)]">
                        {item.cycleName}
                      </Link>
                      {" · Target: "}
                      {item.targetDate}
                      {item.source === "insight" ? " · From AI Synthesis" : null}
                    </p>
                    {item.progressUpdate ? <p className="mt-2 secondary-text">{item.progressUpdate}</p> : null}
                  </div>
                  <StatusBadge status={item.status} stale={item.stale} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function StatusBadge({ status, stale }: { status: RollupItem["status"]; stale: boolean }) {
  if (status === "completed") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-pill)] bg-[var(--green-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--green)]">
        <CheckCircle2 size={12} strokeWidth={1.8} /> Completed
      </span>
    );
  }
  if (stale) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-pill)] bg-[var(--red-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--red)]">
        <AlertTriangle size={12} strokeWidth={1.8} /> Past target date
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-pill)] bg-[var(--warning-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--warning)]">
      <Clock size={12} strokeWidth={1.8} /> {STATUS_LABEL[status]}
    </span>
  );
}

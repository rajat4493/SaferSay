"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ConfidentialitySeal } from "@/components/ConfidentialitySeal";
import { PilotGuide } from "@/components/PilotGuide";

type ViewMode = "loading" | "workflow";

export default function Dashboard() {
  const router = useRouter();
  const [mode, setMode] = useState<ViewMode>("loading");

  useEffect(() => {
    fetch("/api/tenants/current")
      .then((response) => response.json())
      .then((data) => {
        if (!data.ok) return setMode("workflow");
        // Pure Owner mode (not currently impersonating a tenant) has no
        // business inside /app at all -- the Owner Control Room at /console
        // is the real home, and it never offers a full-access "enter this
        // tenant's workspace" path (see docs/strategy/OWNER_CONTROL_ROOM_SPEC.md
        // §3/§9: the old ability to see/act inside a tenant is support-only
        // now, not a silent full login-as).
        if (data.isSuperAdmin && !data.isImpersonating) {
          router.replace("/console");
          return;
        }
        setMode("workflow");
      })
      .catch(() => setMode("workflow"));
  }, [router]);

  const workflow = [
    { step: "1", title: "Load people", text: "Upload a CSV with employee email, name, team, and location.", href: "/app/participants" },
    { step: "2", title: "Create survey", text: "Pick a template and send a secure invite link to each employee.", href: "/app/surveys/new" },
    { step: "3", title: "Prepare invites", text: "Queue invitations from the participation store only.", href: "/app/integrations" },
    { step: "4", title: "Read report", text: "Reports unlock only when the safe response threshold is met.", href: "/app/reports" },
  ];

  if (mode === "loading") {
    return <AppShell title="Get started" subtitle=" "><div className="h-40" /></AppShell>;
  }

  return (
    <AppShell title="Get started" subtitle="Here's your next step — this page always shows exactly what to do to run one confidential survey.">
      <ConfidentialitySeal />
      <div className="mb-5">
        <PilotGuide />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {workflow.map((item) => (
          <a key={item.title} href={item.href} className="rounded-[var(--radius-card)] border border-[var(--brand-glass-border)] bg-[var(--brand-glass-strong)] p-5 shadow-[var(--shadow-soft)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]">
            <div className="grid h-9 w-9 place-items-center rounded-[var(--radius-pill)] bg-[var(--brand-accent-soft)] text-sm font-semibold text-[var(--brand-accent)]">{item.step}</div>
            <h2 className="mt-4 text-lg font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">{item.text}</p>
          </a>
        ))}
      </div>
    </AppShell>
  );
}

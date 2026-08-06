"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ConfidentialitySeal } from "@/components/ConfidentialitySeal";

type ViewMode = "loading" | "surveys";

export default function SurveysHome() {
  const router = useRouter();
  const [mode, setMode] = useState<ViewMode>("loading");

  useEffect(() => {
    fetch("/api/tenants/current")
      .then((response) => response.json())
      .then((data) => {
        if (!data.ok) return setMode("surveys");
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
        setMode("surveys");
      })
      .catch(() => setMode("surveys"));
  }, [router]);

  if (mode === "loading") {
    return <AppShell title="Surveys" subtitle=" "><div className="h-40" /></AppShell>;
  }

  return (
    <AppShell
      title="Surveys"
      subtitle="Your active and past surveys. Open one to manage invites, responses, and results."
    >
      <ConfidentialitySeal />

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Create a new survey</h2>
            <p className="mt-1 text-sm text-[var(--brand-muted)]">
              Pick a template, customize questions, and send confidential invite links.
            </p>
          </div>
          <Link
            href="/app/surveys/new"
            className="inline-flex items-center gap-2 rounded-[var(--radius-button)] bg-[var(--brand-accent)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-accent-deep)]"
          >
            <Plus size={16} />
            New survey
          </Link>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold">Your surveys</h2>
        <p className="mt-2 text-sm text-[var(--brand-muted)]">
          No surveys yet. Create your first survey to get started.
        </p>
        {/* TODO: Populate with actual surveys from /api/cycles
            - Fetch active/recent cycles
            - Display live survey prominently at top
            - Show past surveys in quiet list below
            - Link each to /app/[surveyId] for detail view with Build/Send/Results stages
        */}
      </div>
    </AppShell>
  );
}

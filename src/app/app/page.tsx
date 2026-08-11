"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Clock, Plus, Settings, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SurveyStatusBadge } from "@/components/SurveyStatusBadge";
import { useToast } from "@/components/ToastProvider";
import { canCreateSurvey } from "@/lib/permissions";
import type { UserRole } from "@/lib/server/repositories/types";

type ViewMode = "loading" | "home";

type SurveyCycle = {
  id: string;
  name: string;
  status: string;
  minGroupSize: number;
  createdAt: string;
  responseCount: number;
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const router = useRouter();
  const toast = useToast();
  const [mode, setMode] = useState<ViewMode>("loading");
  const [canCreate, setCanCreate] = useState(false);
  const [cycles, setCycles] = useState<SurveyCycle[] | null>(null);
  const [employeeCount, setEmployeeCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/tenants/current")
      .then((response) => response.json())
      .then((data) => {
        if (!data.ok) return setMode("home");
        // Pure Owner mode has no business inside /app -- the Owner Control
        // Room at /console is the real home for a platform owner who isn't
        // currently impersonating a tenant.
        if (data.isSuperAdmin && !data.isImpersonating) {
          router.replace("/console");
          return;
        }
        setCanCreate(canCreateSurvey(data.role as UserRole));
        setMode("home");
      })
      .catch(() => setMode("home"));
  }, [router]);

  useEffect(() => {
    if (mode !== "home") return;
    fetch("/api/cycles")
      .then((response) => response.json())
      .then((data: { ok?: boolean; cycles?: SurveyCycle[]; error?: string }) => {
        if (data.ok) {
          setCycles(data.cycles ?? []);
        } else {
          setCycles([]);
          toast.show({ variant: "error", message: data.error ?? "Couldn't load your surveys." });
        }
      })
      .catch(() => setCycles([]));
    fetch("/api/employees?limit=1")
      .then((response) => response.json())
      .then((data: { ok?: boolean; total?: number }) => setEmployeeCount(data.ok ? (data.total ?? 0) : 0))
      .catch(() => setEmployeeCount(0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  if (mode === "loading") {
    return (
      <AppShell title={greeting()} subtitle="Here's what needs your attention.">
        <div className="h-40" />
      </AppShell>
    );
  }

  const liveSurvey = cycles?.find((cycle) => cycle.status === "open");
  const draftSurvey = cycles?.find((cycle) => cycle.status === "draft");
  const everRun = (cycles?.length ?? 0) > 0;
  // Guided next-step only applies to a brand-new workspace that's never run
  // a survey. Once one full cycle has happened, this card gets out of the
  // way and Home goes back to plain status -- the guidance is for getting
  // started, not a permanent fixture.
  const showGuidedStep = !liveSurvey && !everRun && employeeCount !== null;

  return (
    <AppShell title={`${greeting()}.`} subtitle="Here's what needs your attention.">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="card">
          {liveSurvey ? (
            <>
              <div className="flex items-center gap-2">
                <h2 className="section-title text-[15px]">{liveSurvey.name}</h2>
                <SurveyStatusBadge status={liveSurvey.status} />
              </div>
              <p className="mt-2 secondary-text">
                {liveSurvey.responseCount} of {liveSurvey.minGroupSize} responses
              </p>
              <div className="progress-track mt-2.5">
                <div
                  className="progress-fill"
                  style={{ background: "var(--green)", width: `${Math.min((liveSurvey.responseCount / liveSurvey.minGroupSize) * 100, 100)}%` }}
                />
              </div>
              <p className="mt-2 text-[12px] text-[var(--ink-soft)]">
                {liveSurvey.responseCount >= liveSurvey.minGroupSize
                  ? "Results unlocked."
                  : `Results unlock after ${liveSurvey.minGroupSize - liveSurvey.responseCount} more response${
                      liveSurvey.minGroupSize - liveSurvey.responseCount === 1 ? "" : "s"
                    }.`}
              </p>
              <Link href={`/app/${liveSurvey.id}/results`} className="btn-primary mt-4 w-full justify-center">
                Open survey
              </Link>
            </>
          ) : showGuidedStep && employeeCount === 0 ? (
            <>
              <p className="label-text text-[var(--green)]">Your next step</p>
              <h2 className="mt-1.5 section-title text-[15px]">Add your people</h2>
              <p className="mt-2 secondary-text">Add the people who should receive this survey.</p>
              <Link href="/app/people" className="btn-primary mt-4 w-full justify-center">
                Add people →
              </Link>
            </>
          ) : showGuidedStep && canCreate ? (
            <>
              <p className="label-text text-[var(--green)]">Your next step</p>
              <h2 className="mt-1.5 section-title text-[15px]">Create your first survey</h2>
              <p className="mt-2 secondary-text">Pick a template to get started.</p>
              <Link href="/app/surveys/new" className="btn-primary mt-4 w-full justify-center">
                Create survey →
              </Link>
            </>
          ) : draftSurvey ? (
            <>
              <p className="label-text text-[var(--green)]">Your next step</p>
              <h2 className="mt-1.5 section-title text-[15px]">{draftSurvey.name}</h2>
              <p className="mt-2 secondary-text">This survey is drafted but hasn&apos;t been sent yet.</p>
              <Link href={`/app/${draftSurvey.id}/send`} className="btn-primary mt-4 w-full justify-center">
                Review and send →
              </Link>
            </>
          ) : (
            <>
              <h2 className="section-title text-[15px]">No active survey</h2>
              <p className="mt-2 secondary-text">Start a new survey to hear from your team.</p>
              {canCreate ? (
                <Link href="/app/surveys/new" className="btn-primary mt-4 w-full justify-center">
                  <Plus size={14} strokeWidth={1.8} />
                  New survey
                </Link>
              ) : null}
            </>
          )}
        </div>

        <div className="card">
          <h2 className="section-title text-[15px]">All surveys</h2>
          <p className="mt-2 secondary-text">
            {cycles === null ? "Loading…" : `${cycles.length} survey${cycles.length === 1 ? "" : "s"} total, past and present.`}
          </p>
          <Link href="/app/surveys" className="btn-secondary mt-4 w-full justify-center">
            View all surveys
          </Link>
        </div>
      </div>

      <div className="mt-3 divide-y divide-[var(--border)] rounded-[var(--radius-card)] border border-[var(--border)] bg-white">
        <ShortcutRow href="/app/surveys" icon={Clock} label="Past surveys" description="View completed surveys and results" />
        <ShortcutRow href="/app/people" icon={Users} label="Employees" description="Manage your team and invites" />
        <ShortcutRow href="/app/workspace/settings" icon={Settings} label="Settings" description="Workspace, privacy, and notifications" />
      </div>
    </AppShell>
  );
}

function ShortcutRow({ href, icon: Icon, label, description }: { href: string; icon: typeof Clock; label: string; description: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-[var(--bg-hover)]">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-[var(--bg-active)] text-[var(--ink-mid)]">
        <Icon size={15} strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-medium text-[var(--ink)]">{label}</p>
        <p className="text-[12px] text-[var(--ink-soft)]">{description}</p>
      </div>
    </Link>
  );
}

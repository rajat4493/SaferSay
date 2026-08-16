"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ConfidentialitySeal } from "@/components/ConfidentialitySeal";
import { FirstRunGuide } from "@/components/FirstRunGuide";
import { SkeletonCard } from "@/components/Skeleton";
import { SurveyStatusBadge } from "@/components/SurveyStatusBadge";
import { useToast } from "@/components/ToastProvider";
import { canCreateSurvey } from "@/lib/permissions";
import { surveyTemplates } from "@/lib/templates";
import type { UserRole } from "@/lib/server/repositories/types";

type ViewMode = "loading" | "surveys";

type SurveyCycle = {
  id: string;
  name: string;
  status: string;
  minGroupSize: number;
  createdAt: string;
  responseCount: number;
};

type Participation = { issued: number; spent: number };

export default function SurveysHome() {
  const router = useRouter();
  const toast = useToast();
  const [mode, setMode] = useState<ViewMode>("loading");
  const [cycles, setCycles] = useState<SurveyCycle[] | null>(null);
  const [firstRunCompleted, setFirstRunCompleted] = useState(true);
  const [canCreate, setCanCreate] = useState(false);
  const [liveParticipation, setLiveParticipation] = useState<Participation | null>(null);

  useEffect(() => {
    fetch("/api/tenants/current")
      .then((response) => response.json())
      .then((data) => {
        if (!data.ok) return setMode("surveys");
        // Pure Owner mode (not currently impersonating a tenant) has no
        // business inside /app at all -- the Owner Control Room at /console
        // is the real home, and it never offers a full-access "enter this
        // tenant's workspace" path.
        if (data.isSuperAdmin && !data.isImpersonating) {
          router.replace("/console");
          return;
        }
        setFirstRunCompleted(Boolean(data.firstRunCompleted));
        setCanCreate(canCreateSurvey(data.role as UserRole));
        setMode("surveys");
      })
      .catch(() => setMode("surveys"));
  }, [router]);

  useEffect(() => {
    if (mode !== "surveys") return;
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
      .catch(() => {
        setCycles([]);
        toast.show({ variant: "error", message: "Couldn't load your surveys." });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Bucket by real status, not by "is/isn't the featured card" -- a
  // second simultaneously-open cycle (or a draft) must never land under
  // "Past surveys" just because it wasn't the one `.find()` picked first.
  const openCycles = cycles?.filter((cycle) => cycle.status === "open") ?? [];
  const liveSurvey = openCycles[0];
  const additionalLiveCycles = openCycles.slice(1);
  const draftCycles = cycles?.filter((cycle) => cycle.status === "draft" || cycle.status === "scheduled") ?? [];
  const pastSurveys = cycles?.filter((cycle) => cycle.status === "closed") ?? [];

  // Response-rate stat is scoped to the live survey's real issued/spent
  // token counts (identity.survey_participants) -- not a guess against
  // total headcount, which would overstate the rate for cycles that
  // haven't invited everyone yet.
  useEffect(() => {
    if (!liveSurvey) {
      Promise.resolve().then(() => setLiveParticipation(null));
      return;
    }
    fetch(`/api/cycles/${liveSurvey.id}`)
      .then((response) => response.json())
      .then((data: { ok?: boolean; participation?: Participation }) => {
        setLiveParticipation(data.ok && data.participation ? data.participation : null);
      })
      .catch(() => setLiveParticipation(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveSurvey?.id]);

  if (mode === "loading") {
    return (
      <AppShell title="Surveys" subtitle=" ">
        <div className="h-40" />
      </AppShell>
    );
  }

  const activeSurveyCount = openCycles.length;
  const responseRate = liveParticipation && liveParticipation.issued > 0 ? Math.round((liveParticipation.spent / liveParticipation.issued) * 100) : null;
  const threshold = liveSurvey?.minGroupSize ?? null;
  const featuredTemplates = surveyTemplates.slice(0, 3);

  return (
    <AppShell title="Surveys" subtitle="Your active and past surveys. Open one to manage invites, responses, and results.">
      {cycles !== null && cycles.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
          <StatCard icon={Users} label="Active surveys" value={String(activeSurveyCount)} sub={activeSurveyCount === 1 ? "1 survey live now" : `${activeSurveyCount} surveys live now`} />
          <StatCard
            icon={TrendingUp}
            label="Response rate"
            value={responseRate !== null ? `${responseRate}%` : "—"}
            sub={liveParticipation ? `${liveParticipation.spent} of ${liveParticipation.issued} respondents` : "No live survey"}
          />
          <StatCard icon={ShieldCheck} label="Threshold minimum" value={threshold !== null ? String(threshold) : "—"} sub="Minimum responses to unlock" />
        </div>
      ) : null}

      <ConfidentialitySeal />

      {!firstRunCompleted && canCreate ? <FirstRunGuide /> : null}

      {canCreate ? (
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="section-title">Create a new survey</h2>
              <p className="mt-1 secondary-text">Choose a template to get started. Customize questions and send confidential invites in minutes.</p>
            </div>
            <Link href="/app/surveys/new" className="btn-primary">
              <Plus size={14} strokeWidth={1.8} />
              New survey
            </Link>
          </div>

          <div className="mt-2.5 grid gap-2.5 md:grid-cols-3">
            {featuredTemplates.map((template) => (
              <Link key={template.slug} href={`/app/surveys/new?template=${template.slug}`} className="card card-interactive block">
                <div className="grid h-9 w-9 place-items-center rounded-[10px] bg-[var(--green-bg)] text-[var(--green)]">
                  <ShieldCheck size={16} strokeWidth={1.8} />
                </div>
                <h3 className="mt-3 text-[14px] font-medium text-[var(--ink)]">{template.name}</h3>
                <p className="mt-1 text-[12.5px] leading-[1.5] text-[var(--ink-mid)]">{template.description}</p>
                <span className="mt-2.5 inline-flex items-center rounded-[var(--radius-pill)] bg-[var(--bg-active)] px-2.5 py-1 text-[11px] font-medium text-[var(--ink-mid)]">
                  {template.duration}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {cycles === null ? (
        <div className="mt-6 grid gap-2.5 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : cycles.length === 0 ? (
        <div className="mt-6">
          <h2 className="section-title">Your surveys</h2>
          <p className="mt-2 secondary-text">No surveys yet. Create your first survey to get started.</p>
        </div>
      ) : (
        <>
          {liveSurvey ? (
            <div className="mt-6">
              <h2 className="section-title">Live survey</h2>
              <SurveyCard cycle={liveSurvey} participation={liveParticipation} featured className="mt-2.5" />
              {additionalLiveCycles.length > 0 ? (
                <div className="mt-2.5 space-y-2">
                  {additionalLiveCycles.map((cycle) => (
                    <SurveyCard key={cycle.id} cycle={cycle} />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {draftCycles.length > 0 ? (
            <div className="mt-6">
              <h2 className="section-title">Drafts</h2>
              <div className="mt-2.5 space-y-2">
                {draftCycles.map((cycle) => (
                  <SurveyCard key={cycle.id} cycle={cycle} />
                ))}
              </div>
            </div>
          ) : null}

          {pastSurveys.length > 0 ? (
            <div className="mt-6">
              <h2 className="section-title">Past surveys</h2>
              <div className="mt-2.5 space-y-2">
                {pastSurveys.map((cycle) => (
                  <SurveyCard key={cycle.id} cycle={cycle} />
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </AppShell>
  );
}

function StatCard({ icon: Icon, label, value, sub }: { icon: typeof Users; label: string; value: string; sub: string }) {
  return (
    <div className="card">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[var(--green-bg)] text-[var(--green)]">
          <Icon size={16} strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <p className="text-[12px] text-[var(--ink-mid)]">{label}</p>
          <p className="data-number">{value}</p>
          <p className="mt-0.5 text-[11.5px] text-[var(--ink-soft)]">{sub}</p>
        </div>
      </div>
    </div>
  );
}

function SurveyCard({ cycle, featured, participation, className = "" }: { cycle: SurveyCycle; featured?: boolean; participation?: Participation | null; className?: string }) {
  const percent = participation && participation.issued > 0 ? Math.round((participation.spent / participation.issued) * 100) : null;
  return (
    <Link href={`/app/${cycle.id}`} className={`card card-interactive block ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className={`truncate ${featured ? "text-[16px] font-semibold" : "text-[14px] font-medium"} text-[var(--ink)]`}>{cycle.name}</h3>
            <SurveyStatusBadge status={cycle.status} />
          </div>
          <p className="mt-1 secondary-text">
            {cycle.responseCount} {cycle.responseCount === 1 ? "response" : "responses"} · Created{" "}
            {new Date(cycle.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </p>
          {featured && percent !== null ? (
            <div className="mt-3 max-w-xs">
              <div className="progress-track">
                <div className="progress-fill" style={{ background: "var(--green)", width: `${Math.min(percent, 100)}%` }} />
              </div>
              <p className="mt-1.5 text-[11.5px] text-[var(--ink-soft)]">
                {percent}% of threshold · {participation!.spent} of {participation!.issued} responded
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

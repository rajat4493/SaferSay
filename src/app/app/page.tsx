"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ConfidentialitySeal } from "@/components/ConfidentialitySeal";
import { SkeletonCard } from "@/components/Skeleton";
import { SurveyStatusBadge } from "@/components/SurveyStatusBadge";
import { useToast } from "@/components/ToastProvider";

type ViewMode = "loading" | "surveys";

type SurveyCycle = {
  id: string;
  name: string;
  status: string;
  minGroupSize: number;
  createdAt: string;
  responseCount: number;
};

export default function SurveysHome() {
  const router = useRouter();
  const toast = useToast();
  const [mode, setMode] = useState<ViewMode>("loading");
  const [cycles, setCycles] = useState<SurveyCycle[] | null>(null);

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

  if (mode === "loading") {
    return (
      <AppShell title="Surveys" subtitle=" ">
        <div className="h-40" />
      </AppShell>
    );
  }

  const liveSurvey = cycles?.find((cycle) => cycle.status === "open");
  const otherSurveys = cycles?.filter((cycle) => cycle.id !== liveSurvey?.id) ?? [];

  return (
    <AppShell title="Surveys" subtitle="Your active and past surveys. Open one to manage invites, responses, and results.">
      <ConfidentialitySeal />

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="section-title">Create a new survey</h2>
            <p className="mt-1 secondary-text">Pick a template, customize questions, and send confidential invite links.</p>
          </div>
          <Link href="/app/surveys/new" className="btn-primary">
            <Plus size={14} strokeWidth={1.8} />
            New survey
          </Link>
        </div>
      </div>

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
              <SurveyCard cycle={liveSurvey} featured className="mt-2.5" />
            </div>
          ) : null}

          {otherSurveys.length > 0 ? (
            <div className="mt-6">
              <h2 className="section-title">{liveSurvey ? "Past surveys" : "Your surveys"}</h2>
              <div className="mt-2.5 space-y-2">
                {otherSurveys.map((cycle) => (
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

function SurveyCard({ cycle, featured, className = "" }: { cycle: SurveyCycle; featured?: boolean; className?: string }) {
  return (
    <Link href={`/app/${cycle.id}`} className={`card card-interactive block ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`truncate ${featured ? "text-[16px] font-semibold" : "text-[14px] font-medium"} text-[var(--ink)]`}>{cycle.name}</h3>
            <SurveyStatusBadge status={cycle.status} />
          </div>
          <p className="mt-1 secondary-text">
            {cycle.responseCount} {cycle.responseCount === 1 ? "response" : "responses"} · Created{" "}
            {new Date(cycle.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </div>
    </Link>
  );
}

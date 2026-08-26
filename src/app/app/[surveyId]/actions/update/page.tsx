"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Bold, Check, Copy, Eye, Heading1, Heading2, Italic, Link2, List, ListOrdered, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useToast } from "@/components/ToastProvider";
import { canRunSurvey } from "@/lib/permissions";
import type { UserRole } from "@/lib/server/repositories/types";

type CycleDetail = { cycle: { id: string; name: string } };

// STUB: no LLM summarization/drafting pipeline exists yet. This draft is a
// static template seeded with the real cycle name, not model output --
// swapping in a real "/api/report/draft" call is a data-only change once
// that pipeline exists.
const commitments = [
  "We're reducing recurring meetings to protect focus time.",
  "We're launching a weekly cross-team update to improve visibility.",
  "We're clarifying priorities and the “why now” behind our roadmap.",
];

export default function DraftUpdatePage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const surveyId = params.surveyId as string;
  const [cycleName, setCycleName] = useState<string | null>(null);
  const [accessChecked, setAccessChecked] = useState(false);
  const [slackConnected, setSlackConnected] = useState(false);
  const [postingToSlack, setPostingToSlack] = useState(false);

  useEffect(() => {
    fetch("/api/tenants/current")
      .then((response) => response.json())
      .then((data: { ok?: boolean; role?: UserRole }) => {
        if (data.ok && !canRunSurvey(data.role as UserRole)) {
          router.replace(`/app/${surveyId}/results`);
          return;
        }
        // A team update implies you know what the survey found -- don't let
        // this page render (directly by URL or otherwise) while results are
        // still protected, same rule the disabled button on Results enforces.
        fetch(`/api/report?cycleId=${encodeURIComponent(surveyId)}`)
          .then((reportResponse) => reportResponse.json())
          .then((reportData: { ok?: boolean; report?: { protected: boolean } }) => {
            if (reportData.ok && reportData.report?.protected) {
              router.replace(`/app/${surveyId}/results`);
              return;
            }
            setAccessChecked(true);
          })
          .catch(() => setAccessChecked(true));
      })
      .catch(() => undefined);
  }, [router, surveyId]);

  useEffect(() => {
    fetch(`/api/cycles/${surveyId}`)
      .then((response) => response.json())
      .then((data: { ok?: boolean } & Partial<CycleDetail>) => {
        if (data.ok && data.cycle) setCycleName(data.cycle.name);
      })
      .catch(() => undefined);
  }, [surveyId]);

  useEffect(() => {
    fetch("/api/tenants/settings")
      .then((response) => response.json())
      .then((data: { ok?: boolean; settings?: { slackConnected?: boolean } }) => {
        if (data.ok) setSlackConnected(Boolean(data.settings?.slackConnected));
      })
      .catch(() => undefined);
  }, []);

  if (!accessChecked) return null;

  const title = `You spoke, we heard: here's what we're changing about ${cycleName ?? "this survey"}`;
  const body = `Thank you to everyone who shared feedback in ${cycleName ? `"${cycleName}"` : "our recent survey"}. Your input helps us build a more transparent, focused team. Here's what we're doing:`;

  function draftLines() {
    return [title, "", body, "", ...commitments.map((line) => `- ${line}`), "", "We'll keep listening and keep you updated on our progress."];
  }

  async function copyAsEmail() {
    try {
      await navigator.clipboard.writeText(draftLines().join("\n"));
      toast.show({ variant: "success", message: "Draft copied — paste it into your email client." });
    } catch {
      toast.show({ variant: "error", message: "Couldn't copy to your clipboard. Try selecting the text manually." });
    }
  }

  async function shareToSlack() {
    setPostingToSlack(true);
    try {
      const response = await fetch("/api/slack/post", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: draftLines().join("\n") }),
      });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (data.ok) {
        toast.show({ variant: "success", message: "Posted to your Slack channel." });
      } else {
        toast.show({ variant: "error", message: data.error ?? "Couldn't post to Slack." });
      }
    } finally {
      setPostingToSlack(false);
    }
  }

  return (
    <AppShell title="Draft your update" subtitle="Use AI to craft a thoughtful response to your team.">
      <div className="space-y-[22px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.05em] text-[var(--green)]">Close the loop</p>
          <button onClick={() => router.push(`/app/${surveyId}/results`)} className="btn-secondary">
            <ArrowLeft size={14} strokeWidth={1.8} />
            View feedback themes
          </button>
        </div>

        <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-white shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
              <div className="flex items-center gap-1 text-[var(--ink-soft)]">
                <ToolbarGlyph label="H1">
                  <Heading1 size={14} strokeWidth={1.8} />
                </ToolbarGlyph>
                <ToolbarGlyph label="H2">
                  <Heading2 size={14} strokeWidth={1.8} />
                </ToolbarGlyph>
                <ToolbarGlyph label="Bold">
                  <Bold size={14} strokeWidth={1.8} />
                </ToolbarGlyph>
                <ToolbarGlyph label="Italic">
                  <Italic size={14} strokeWidth={1.8} />
                </ToolbarGlyph>
                <ToolbarGlyph label="Bulleted list">
                  <List size={14} strokeWidth={1.8} />
                </ToolbarGlyph>
                <ToolbarGlyph label="Numbered list">
                  <ListOrdered size={14} strokeWidth={1.8} />
                </ToolbarGlyph>
                <ToolbarGlyph label="Link">
                  <Link2 size={14} strokeWidth={1.8} />
                </ToolbarGlyph>
              </div>
              <span className="badge-beta">
                <Sparkles size={11} strokeWidth={1.8} className="mr-1" />
                AI generated
              </span>
            </div>

            <div className="px-6 py-6">
              <h3 className="font-[family-name:var(--font-display)] text-[26px] font-normal leading-[1.3] text-[var(--ink)]">{title}</h3>
              <p className="mt-3 text-[13.5px] leading-[1.6] text-[var(--ink-mid)]">{body}</p>
              <ul className="mt-3.5 space-y-1.5">
                {commitments.map((line) => (
                  <li key={line} className="flex items-start gap-2 text-[13.5px] text-[var(--ink)]">
                    <Check size={15} strokeWidth={2} className="mt-0.5 shrink-0 text-[var(--green)]" />
                    {line}
                  </li>
                ))}
              </ul>
              <p className="mt-3.5 text-[13.5px] leading-[1.6] text-[var(--ink-mid)]">We&apos;ll keep listening and keep you updated on our progress.</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="card">
              <h3 className="section-title text-[15px]">Share your update</h3>
              <p className="mt-1 secondary-text">Post to your team channel or copy as email.</p>

              <button
                onClick={shareToSlack}
                disabled={!slackConnected || postingToSlack}
                title={slackConnected ? undefined : "Connect Slack in workspace settings first"}
                className="btn-secondary mt-4 w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
              >
                <BrandGridGlyph />
                {postingToSlack ? "Posting..." : "Share with Slack"}
              </button>
              <button onClick={copyAsEmail} className="btn-primary mt-2 w-full justify-center">
                <Copy size={14} strokeWidth={1.8} />
                Copy as email
              </button>
              <button className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 text-[12px] font-medium text-[var(--ink-soft)] hover:text-[var(--ink)]">
                <Eye size={13} strokeWidth={1.8} />
                Preview message
              </button>
            </div>

            <div className="flex items-center gap-2 px-1 text-[12px] text-[var(--ink-soft)]">
              <Check size={14} strokeWidth={2} className="text-[var(--green)]" />
              Built on anonymity. Backed by trust.
            </div>
          </div>
        </div>

        <div className="flex justify-start">
          <button onClick={() => router.push(`/app/${surveyId}/results`)} className="btn-secondary">
            <ArrowLeft size={14} strokeWidth={1.8} />
            Back to Team Pulse
          </button>
        </div>
      </div>
    </AppShell>
  );
}

function ToolbarGlyph({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <span aria-label={label} className="grid h-[26px] w-[26px] place-items-center rounded-[6px]">
      {children}
    </span>
  );
}

function BrandGridGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="4" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="14" y="4" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="4" y="14" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="14" y="14" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

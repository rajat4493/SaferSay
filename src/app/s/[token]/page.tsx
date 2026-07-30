"use client";

import { ArrowLeft, ArrowRight, Check, EyeOff } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { useBrand } from "@/components/BrandProvider";
import { useSurveyData } from "@/components/DataProvider";
import { questionBank, submitTokenResponse } from "@/lib/localData";

export default function RespondentTokenPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const { brand } = useBrand();
  const { data, setData } = useSurveyData();
  const [step, setStep] = useState<"intro" | "survey" | "done">("intro");
  const [answers, setAnswers] = useState<number[]>([]);
  const participant = data.identity.participants.find((item) => item.token === token);
  const valid = Boolean(participant && participant.status === "issued");
  const current = answers.length;
  const question = questionBank[current];

  function answer(value: number) {
    const next = [...answers, value];
    if (next.length >= questionBank.length) {
      setData(submitTokenResponse(data, token, next));
      setAnswers(next);
      setStep("done");
    } else {
      setAnswers(next);
    }
  }

  return (
    <main className="min-h-screen bg-[#111] p-4 text-[var(--brand-ink)]">
      <section className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-5xl place-items-center rounded-[2.5rem] bg-[var(--brand-bg)] p-5">
        <div className="w-full max-w-xl">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BrandMark />
              <div>
                <h1 className="font-semibold">{brand.name}</h1>
                <p className="text-xs text-[var(--brand-muted)]">Confidential employee survey</p>
              </div>
            </div>
            <div className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-[var(--brand-muted)]">
              {step === "survey" ? `${current + 1}/${questionBank.length}` : "5 min"}
            </div>
          </div>

          {!valid && step !== "done" ? (
            <Panel title="This link is not active" text="The token is missing, already submitted, or the demo has not loaded participants yet." />
          ) : step === "intro" ? (
            <div className="rounded-[2rem] bg-white p-6 shadow-sm">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[var(--brand-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-accent)]">
                <EyeOff size={14} />
                Before question 1
              </div>
              <h2 className="text-4xl font-semibold leading-tight tracking-[-0.04em]">How your answers stay confidential</h2>
              <div className="mt-5 space-y-3 text-sm leading-6 text-[var(--brand-muted)]">
                <p>Sign-in confirms you are eligible and prevents duplicate responses.</p>
                <p>Your answers are stored separately from your identity.</p>
                <p>Your employer sees grouped results only. Groups under five stay hidden.</p>
              </div>
              <button onClick={() => setStep("survey")} className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--brand-accent)] text-sm font-semibold text-white">
                Start survey
                <ArrowRight size={16} />
              </button>
            </div>
          ) : step === "done" ? (
            <div className="rounded-[2rem] bg-white p-6 text-center shadow-sm">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--brand-accent-soft)] text-[var(--brand-accent)]">
                <Check />
              </div>
              <h2 className="mt-5 text-3xl font-semibold">Thanks. Your answers are in.</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--brand-muted)]">Your participation was marked complete separately from your response content.</p>
            </div>
          ) : (
            <div className="rounded-[2rem] bg-white p-6 shadow-sm">
              <div className="mb-5 h-2 rounded-full bg-[var(--brand-border)]">
                <div className="h-full rounded-full bg-[var(--brand-accent)]" style={{ width: `${((current + 1) / questionBank.length) * 100}%` }} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-muted)]">{question.label}</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.03em]">{question.text}</h2>
              <div className="mt-7 grid gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button key={value} onClick={() => answer(value)} className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-bg)] px-4 py-4 text-left text-sm font-semibold hover:border-[var(--brand-accent)]">
                    {value} {value === 1 ? "Strongly disagree" : value === 5 ? "Strongly agree" : ""}
                  </button>
                ))}
              </div>
              <button disabled={current === 0} onClick={() => setAnswers(answers.slice(0, -1))} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-muted)] disabled:opacity-30">
                <ArrowLeft size={15} />
                Back
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function Panel({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-sm">
      <h2 className="text-3xl font-semibold">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-[var(--brand-muted)]">{text}</p>
    </div>
  );
}

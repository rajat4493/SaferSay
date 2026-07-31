"use client";

import { ArrowLeft, ArrowRight, Check, EyeOff } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { useBrand } from "@/components/BrandProvider";
import { useSurveyData } from "@/components/DataProvider";
import { questionBank, submitTokenResponse } from "@/lib/localData";

type SurveyQuestion = {
  id: string;
  position: number;
  text: string;
  type: "likert_5" | "enps_0_10" | "open_text";
  construct: string | null;
  optional: boolean;
};

type SurveySession = {
  cycleName: string;
  templateName: string;
  questions: SurveyQuestion[];
};

type Answer = {
  questionId: string;
  numberValue?: number;
  textValue?: string;
};

export default function RespondentTokenPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const { brand } = useBrand();
  const { data, setData } = useSurveyData();
  const [step, setStep] = useState<"loading" | "intro" | "survey" | "done" | "invalid">("loading");
  const [session, setSession] = useState<SurveySession | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [textValue, setTextValue] = useState("");
  const [error, setError] = useState("");

  const localParticipant = data.identity.participants.find((item) => item.token === token);
  const localQuestions = useMemo(
    () =>
      questionBank.map((question, index) => ({
        id: question.id,
        position: index + 1,
        text: question.text,
        type: "likert_5" as const,
        construct: question.label,
        optional: false,
      })),
    [],
  );
  const questions = session?.questions ?? localQuestions;
  const current = answers.length;
  const question = questions[current];
  const progressText = step === "survey" ? `${current + 1}/${questions.length}` : "5 min";

  useEffect(() => {
    let active = true;
    async function loadSession() {
      const response = await fetch(`/api/respondent/session?token=${encodeURIComponent(token)}`);
      const result = (await response.json().catch(() => ({}))) as { ok?: boolean; session?: SurveySession; error?: string };
      if (!active) return;

      if (response.ok && result.session) {
        setSession(result.session);
        setStep("intro");
        return;
      }

      if (response.status === 503 && localParticipant?.status === "issued") {
        setSession(null);
        setStep("intro");
        return;
      }

      setError(result.error ?? "This survey link is not active.");
      setStep("invalid");
    }
    loadSession();
    return () => {
      active = false;
    };
  }, [localParticipant?.status, token]);

  async function answerNumeric(value: number) {
    await recordAnswer({ questionId: question.id, numberValue: value });
  }

  async function answerText() {
    if (!textValue.trim() && !question.optional) return;
    await recordAnswer({ questionId: question.id, textValue: textValue.trim() });
    setTextValue("");
  }

  async function skipOptional() {
    await recordAnswer({ questionId: question.id, textValue: "" });
    setTextValue("");
  }

  async function recordAnswer(answer: Answer) {
    const next = [...answers, answer];
    if (next.length < questions.length) {
      setAnswers(next);
      return;
    }

    if (session) {
      const response = await fetch("/api/respondent/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, answers: next.filter((item) => item.numberValue !== undefined || item.textValue) }),
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as { error?: string };
        setError(result.error ?? "Your response could not be submitted.");
        setStep("invalid");
        return;
      }
    } else {
      setData(submitTokenResponse(data, token, next.map((item) => item.numberValue ?? 0).filter(Boolean)));
    }

    setAnswers(next);
    setStep("done");
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
            <div className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-[var(--brand-muted)]">{progressText}</div>
          </div>

          {step === "loading" ? (
            <Panel title="Checking your link" text="This takes a moment." />
          ) : step === "invalid" ? (
            <Panel title="This link is not active" text={error || "The token is missing, already submitted, or no longer valid."} />
          ) : step === "intro" ? (
            <div className="rounded-[2rem] bg-white p-6 shadow-sm">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[var(--brand-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-accent)]">
                <EyeOff size={14} />
                Before question 1
              </div>
              <h2 className="text-4xl font-semibold leading-tight tracking-[-0.04em]">How your answers stay confidential</h2>
              <div className="mt-5 space-y-3 text-sm leading-6 text-[var(--brand-muted)]">
                <p>This link confirms eligibility and prevents duplicate responses.</p>
                <p>Your answers are stored separately from identity and participation state.</p>
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
          ) : question ? (
            <div className="rounded-[2rem] bg-white p-6 shadow-sm">
              <div className="mb-5 h-2 rounded-full bg-[var(--brand-border)]">
                <div className="h-full rounded-full bg-[var(--brand-accent)]" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-muted)]">{question.construct ?? session?.templateName ?? "Survey"}</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.03em]">{question.text}</h2>
              {question.type === "open_text" ? (
                <div className="mt-7 grid gap-3">
                  <textarea value={textValue} onChange={(event) => setTextValue(event.target.value)} className="min-h-36 rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-bg)] p-4 text-sm outline-none focus:border-[var(--brand-accent)]" />
                  <button onClick={answerText} className="rounded-full bg-[var(--brand-accent)] px-4 py-3 text-sm font-semibold text-white">Continue</button>
                  {question.optional ? <button onClick={skipOptional} className="text-sm font-semibold text-[var(--brand-muted)]">Skip</button> : null}
                </div>
              ) : (
                <div className="mt-7 grid gap-2">
                  {scaleValues(question.type).map((value) => (
                    <button key={value} onClick={() => answerNumeric(value)} className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-bg)] px-4 py-4 text-left text-sm font-semibold hover:border-[var(--brand-accent)]">
                      {value} {scaleLabel(question.type, value)}
                    </button>
                  ))}
                </div>
              )}
              <button disabled={current === 0} onClick={() => setAnswers(answers.slice(0, -1))} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-muted)] disabled:opacity-30">
                <ArrowLeft size={15} />
                Back
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function scaleValues(type: SurveyQuestion["type"]) {
  return type === "enps_0_10" ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : [1, 2, 3, 4, 5];
}

function scaleLabel(type: SurveyQuestion["type"], value: number) {
  if (type === "enps_0_10") {
    if (value === 0) return "Not at all likely";
    if (value === 10) return "Extremely likely";
    return "";
  }
  if (value === 1) return "Strongly disagree";
  if (value === 5) return "Strongly agree";
  return "";
}

function Panel({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-sm">
      <h2 className="text-3xl font-semibold">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-[var(--brand-muted)]">{text}</p>
    </div>
  );
}

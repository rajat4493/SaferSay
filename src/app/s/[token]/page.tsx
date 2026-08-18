"use client";

import { ArrowLeft, ArrowRight, Check, Download, Heart, Lock, ShieldCheck, EyeOff } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useBrand } from "@/components/BrandProvider";
import { useSurveyData } from "@/components/DataProvider";
import { SosButton } from "@/components/SosButton";
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
  const [selectedValue, setSelectedValue] = useState<number | null>(null);
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
  const progressPercent = questions.length ? Math.round((current / questions.length) * 100) : 0;
  const scaleOptions = question && question.type !== "open_text" ? scaleValues(question.type) : [];
  // Digit keys 0-9 map directly to a same-valued option (no letter badges
  // needed since the circle already shows its number). eNPS's 10 has no
  // single-digit key -- a reasonable trade-off, click/tap still works.
  const usesKeyboardSelect = scaleOptions.length > 0 && scaleOptions.every((value) => value >= 0 && value <= 9);

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

  const recordAnswer = useCallback(
    async (answer: Answer) => {
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
    },
    [answers, data, questions.length, session, setData, token],
  );

  async function commitSelection(value: number) {
    if (!question) return;
    setSelectedValue(null);
    await recordAnswer({ questionId: question.id, numberValue: value });
  }

  async function answerText() {
    if (!question) return;
    if (!textValue.trim() && !question.optional) return;
    await recordAnswer({ questionId: question.id, textValue: textValue.trim() });
    setTextValue("");
  }

  async function skipOptional() {
    if (!question) return;
    await recordAnswer({ questionId: question.id, textValue: "" });
    setTextValue("");
  }

  function downloadAnswers() {
    const lines = answers.map((answer, index) => {
      const q = questions[index];
      const value = answer.textValue ?? answer.numberValue ?? "(skipped)";
      return `${index + 1}. ${q?.text ?? answer.questionId}\n   Your answer: ${value}`;
    });
    const content = `${brand.name} — your survey answers\n\n${lines.join("\n\n")}\n`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "my-survey-answers.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  // Keyboard support: digit keys select the same-valued option, Enter
  // commits whichever option is currently selected.
  useEffect(() => {
    if (step !== "survey" || !question || question.type === "open_text") return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Enter" && selectedValue !== null) {
        event.preventDefault();
        commitSelection(selectedValue);
        return;
      }
      if (!usesKeyboardSelect) return;
      const digit = Number(event.key);
      if (Number.isInteger(digit) && scaleOptions.includes(digit)) {
        event.preventDefault();
        setSelectedValue(digit);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, question, selectedValue, usesKeyboardSelect, scaleOptions.join(",")]);

  return (
    <main className="taker-surface flex min-h-screen items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-xl">
        <div className="taker-chrome mb-6 flex items-center justify-between">
          <span className="text-[14px] font-semibold tracking-[-0.15px] text-[var(--ink)]">{brand.name}</span>
          {step === "survey" ? (
            <div className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--ink-soft)]">
              Question {current + 1} of {questions.length} &nbsp;·&nbsp; {progressPercent}% complete
            </div>
          ) : null}
        </div>

        {/* Persistent across every step (not just mid-survey) -- a
            respondent may need this before starting, mid-survey, or
            without ever completing it at all. Self-hides entirely when
            the tenant hasn't configured a safety contact. */}
        {step !== "loading" && step !== "invalid" ? (
          <div className="mb-4 flex justify-center">
            <SosButton token={token} />
          </div>
        ) : null}

        {step === "survey" ? (
          <div className="taker-progress-track mb-6">
            <div className="taker-progress-fill" style={{ width: `${(current / questions.length) * 100}%` }} />
          </div>
        ) : null}

        {step === "loading" ? (
          <Panel title="Checking your link" text="This takes a moment." />
        ) : step === "invalid" ? (
          <Panel title="This link is not active" text={error || "The token is missing, already submitted, or no longer valid."} />
        ) : step === "intro" ? (
          <div className="rounded-[var(--radius-shell)] border border-[var(--border)] bg-white p-8 shadow-[var(--shadow-elevated)]">
            <div className="taker-icon-circle mb-5">
              <ShieldCheck size={20} strokeWidth={1.8} />
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-[30px] font-normal leading-[1.18] tracking-[-0.01em] text-[var(--ink)]">How your answers stay confidential</h2>

            <div className="mt-6 space-y-2">
              <ConfidentialityRow
                tone="green"
                heading="Grouped results only"
                description="Your employer sees aggregate scores once enough people respond -- never your name next to an answer."
              />
              <ConfidentialityRow
                tone="green"
                heading="Confirms you're eligible, once"
                description="This link checks you're an active employee and prevents duplicate responses. That's all it's for."
              />
              <ConfidentialityRow
                tone="red"
                heading="Who said what"
                description="Your answers are stored completely separately from your identity. There's no join between the two -- not even we can trace this back to you."
              />
            </div>

            <button onClick={() => setStep("survey")} className="btn-primary mt-7 w-full justify-center py-3">
              Start survey
            </button>

            <div className="mt-5 flex justify-center">
              <span className="taker-footer-badge">
                <Lock size={12} strokeWidth={1.8} />
                Anonymous token · Zero tracking
              </span>
            </div>
          </div>
        ) : step === "done" ? (
          <div className="rounded-[var(--radius-shell)] border border-[var(--border)] bg-white p-8 text-center shadow-[var(--shadow-elevated)]">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--green-bg)] text-[var(--green)]">
              <Check size={26} strokeWidth={2} />
            </div>
            <h2 className="mt-6 font-[family-name:var(--font-display)] text-[30px] font-normal tracking-[-0.01em] text-[var(--ink)]">That&apos;s everything — thank you.</h2>
            <p className="mt-3 text-[13.5px] leading-[1.5] text-[var(--ink-mid)]">Your participation was marked complete separately from your response content.</p>

            <div className="mt-6 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] p-4 text-left text-[13.5px] leading-[1.5] text-[var(--ink-mid)]">
              Your employer will only ever see grouped scores once enough people respond. Nobody -- including us -- can trace this response back to you.
            </div>

            <button onClick={downloadAnswers} className="btn-secondary mx-auto mt-5 justify-center">
              <Download size={14} strokeWidth={1.8} />
              Download a copy of your answers
            </button>
          </div>
        ) : question ? (
          <div key={question.id} className="taker-question-enter rounded-[var(--radius-shell)] border border-[var(--border)] bg-white p-8 shadow-[var(--shadow-elevated)]">
            <div className="taker-icon-circle mb-5">
              <Heart size={19} strokeWidth={1.8} />
            </div>

            <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--ink-soft)]">{question.construct ?? session?.templateName ?? "Survey"}</p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-[34px] font-normal leading-[1.18] tracking-[-0.01em] text-[var(--ink)] sm:text-[38px]">{question.text}</h2>
            <p className="mt-2 text-[13.5px] leading-[1.5] text-[var(--ink-mid)]">
              {question.type === "open_text" ? "No wrong answers — honest is the only answer that helps." : "How true is this for you?"}
            </p>

            {question.type === "open_text" ? (
              <div className="mt-6 grid gap-3">
                <textarea
                  value={textValue}
                  onChange={(event) => setTextValue(event.target.value)}
                  className="min-h-36 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] p-4 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--green)]"
                />
                <button onClick={answerText} className="btn-primary justify-center py-3">
                  Continue
                </button>
                {question.optional ? (
                  <button onClick={skipOptional} className="text-[13px] font-medium text-[var(--ink-mid)] hover:text-[var(--ink)]">
                    Skip
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="mt-7 grid gap-2.5">
                <div className="taker-scale">
                  {scaleOptions.map((value) => {
                    const selected = selectedValue === value;
                    return (
                      <button key={value} onClick={() => setSelectedValue(value)} className="taker-circle" data-selected={selected} aria-label={`${value} ${scaleLabel(question.type, value)}`}>
                        {value}
                      </button>
                    );
                  })}
                </div>
                <div className="taker-scale-labels">
                  <span>{scaleLabel(question.type, scaleOptions[0])}</span>
                  <span>{scaleLabel(question.type, scaleOptions[scaleOptions.length - 1])}</span>
                </div>
                <button
                  disabled={selectedValue === null}
                  onClick={() => selectedValue !== null && commitSelection(selectedValue)}
                  className="btn-primary mt-2 justify-center py-3"
                >
                  Next question
                  <ArrowRight size={14} strokeWidth={1.8} />
                </button>
              </div>
            )}

            <div className="mt-6 flex items-center justify-between">
              <button
                disabled={current === 0}
                onClick={() => {
                  setSelectedValue(null);
                  setAnswers(answers.slice(0, -1));
                }}
                className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--ink-mid)] disabled:opacity-30"
              >
                <ArrowLeft size={14} strokeWidth={1.8} />
                Back
              </button>
              <span className="taker-footer-badge">
                <Lock size={12} strokeWidth={1.8} />
                Anonymous token · Zero tracking
              </span>
            </div>
          </div>
        ) : null}
      </div>
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

function ConfidentialityRow({ tone, heading, description }: { tone: "green" | "red"; heading: string; description: string }) {
  const isGreen = tone === "green";
  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-card)] border border-[var(--border)] p-3.5">
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-[8px] ${
          isGreen ? "bg-[var(--green-bg)] text-[var(--green)]" : "bg-[var(--red-bg)] text-[var(--red)]"
        }`}
      >
        {isGreen ? <ShieldCheck size={16} strokeWidth={1.8} /> : <EyeOff size={16} strokeWidth={1.8} />}
      </span>
      <div>
        <p className="text-[14px] font-medium text-[var(--ink)]">{heading}</p>
        <p className="mt-0.5 text-[13.5px] leading-[1.5] text-[var(--ink-mid)]">{description}</p>
      </div>
    </div>
  );
}

function Panel({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[var(--radius-shell)] border border-[var(--border)] bg-white p-8 shadow-[var(--shadow-elevated)]">
      <h2 className="font-[family-name:var(--font-display)] text-[28px] font-normal tracking-[-0.01em] text-[var(--ink)]">{title}</h2>
      <p className="mt-3 text-[13.5px] leading-[1.5] text-[var(--ink-mid)]">{text}</p>
    </div>
  );
}

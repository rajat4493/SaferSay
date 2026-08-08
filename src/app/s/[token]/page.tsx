"use client";

import { ArrowLeft, Check, Download, ShieldCheck, EyeOff } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
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

const SELECT_KEYS = ["A", "B", "C", "D", "E"];

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
  const progressText = step === "survey" ? `${current + 1} / ${questions.length}` : "5 min";
  const scaleOptions = question && question.type !== "open_text" ? scaleValues(question.type) : [];
  const usesKeyboardSelect = scaleOptions.length > 0 && scaleOptions.length <= SELECT_KEYS.length;

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

  // Keyboard support: letter keys select an option (≤5-option scales
  // only -- eNPS's 11-point scale doesn't map onto A-E), Enter commits
  // whichever option is currently selected.
  useEffect(() => {
    if (step !== "survey" || !question || question.type === "open_text") return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Enter" && selectedValue !== null) {
        event.preventDefault();
        commitSelection(selectedValue);
        return;
      }
      if (!usesKeyboardSelect) return;
      const letterIndex = SELECT_KEYS.indexOf(event.key.toUpperCase());
      if (letterIndex >= 0 && letterIndex < scaleOptions.length) {
        event.preventDefault();
        setSelectedValue(scaleOptions[letterIndex]);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, question, selectedValue, usesKeyboardSelect, scaleOptions.join(",")]);

  return (
    <main className="taker-surface flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="taker-chrome mb-8 flex items-center justify-between">
          <span className="text-[13.5px] font-medium tracking-[-0.15px] text-[var(--ink)]">{brand.name}</span>
          <div className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--ink-soft)]">{progressText}</div>
        </div>

        {step === "loading" ? (
          <Panel title="Checking your link" text="This takes a moment." />
        ) : step === "invalid" ? (
          <Panel title="This link is not active" text={error || "The token is missing, already submitted, or no longer valid."} />
        ) : step === "intro" ? (
          <div className="rounded-[var(--radius-shell)] border border-[var(--border)] bg-white p-7">
            <div className="mb-5 inline-flex items-center gap-2 text-[13.5px] font-medium text-[var(--ink-mid)]">
              <ShieldCheck size={15} strokeWidth={1.8} className="text-[var(--green)]" />
              Confidential — not even we can trace this to you
            </div>
            <h2 className="text-[24px] font-medium leading-[1.3] tracking-[-0.35px] text-[var(--ink)]">How your answers stay confidential</h2>

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
          </div>
        ) : step === "done" ? (
          <div className="rounded-[var(--radius-shell)] border border-[var(--border)] bg-white p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--green-bg)] text-[var(--green)]">
              <Check size={26} strokeWidth={2} />
            </div>
            <h2 className="mt-6 text-[24px] font-medium tracking-[-0.35px] text-[var(--ink)]">That&apos;s everything — thank you.</h2>
            <p className="mt-3 text-[13.5px] leading-[1.5] text-[var(--ink-mid)]">Your participation was marked complete separately from your response content.</p>

            <div className="mt-6 rounded-[var(--radius-card)] border border-[var(--border)] bg-white p-4 text-left text-[13.5px] leading-[1.5] text-[var(--ink-mid)]">
              Your employer will only ever see grouped scores once enough people respond. Nobody -- including us -- can trace this response back to you.
            </div>

            <button onClick={downloadAnswers} className="btn-secondary mx-auto mt-5 justify-center">
              <Download size={14} strokeWidth={1.8} />
              Download a copy of your answers
            </button>
          </div>
        ) : question ? (
          <div key={question.id} className="taker-question-enter rounded-[var(--radius-shell)] border border-[var(--border)] bg-white p-7">
            <div className="taker-progress-track rounded-[var(--radius-pill)]">
              <div className="taker-progress-fill rounded-[var(--radius-pill)]" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
            </div>

            <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--ink-soft)]">{question.construct ?? session?.templateName ?? "Survey"}</p>
            <h2 className="mt-2 text-[24px] font-medium leading-[1.3] tracking-[-0.35px] text-[var(--ink)]">{question.text}</h2>
            <p className="mt-2 text-[13.5px] leading-[1.5] text-[var(--ink-mid)]">No wrong answers — honest is the only answer that helps.</p>

            {question.type === "open_text" ? (
              <div className="mt-6 grid gap-3">
                <textarea
                  value={textValue}
                  onChange={(event) => setTextValue(event.target.value)}
                  className="min-h-36 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] p-4 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--ink-soft)]"
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
              <div className="mt-6 grid gap-2">
                {scaleOptions.map((value, index) => {
                  const selected = selectedValue === value;
                  return (
                    <button key={value} onClick={() => (selected ? commitSelection(value) : setSelectedValue(value))} className="taker-option" data-selected={selected}>
                      {usesKeyboardSelect ? <span className="taker-key-badge">{SELECT_KEYS[index]}</span> : null}
                      <span className="flex-1">
                        {value} {scaleLabel(question.type, value)}
                      </span>
                    </button>
                  );
                })}
                {selectedValue !== null ? (
                  <button onClick={() => commitSelection(selectedValue)} className="btn-primary mt-1 justify-center py-3">
                    Continue{usesKeyboardSelect ? " (or press Enter)" : ""}
                  </button>
                ) : null}
              </div>
            )}

            <button
              disabled={current === 0}
              onClick={() => {
                setSelectedValue(null);
                setAnswers(answers.slice(0, -1));
              }}
              className="mt-5 inline-flex items-center gap-2 text-[13px] font-medium text-[var(--ink-mid)] disabled:opacity-30"
            >
              <ArrowLeft size={14} strokeWidth={1.8} />
              Back
            </button>
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
    <div className="rounded-[var(--radius-shell)] border border-[var(--border)] bg-white p-7">
      <h2 className="text-[24px] font-medium tracking-[-0.35px] text-[var(--ink)]">{title}</h2>
      <p className="mt-3 text-[13.5px] leading-[1.5] text-[var(--ink-mid)]">{text}</p>
    </div>
  );
}

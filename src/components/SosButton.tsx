"use client";

import { useEffect, useState } from "react";
import { LifeBuoy, X } from "lucide-react";

type SosState = "closed" | "form" | "submitting" | "sent";

/**
 * Deliberately hidden entirely (renders null) whenever the tenant hasn't
 * configured a safety contact -- see /api/respondent/sos-availability.
 * Never shown disabled/grayed-out: there's nowhere for it to route to
 * yet, and a respondent in crisis clicking a dead button is worse than
 * the feature not appearing to exist at all. This also naturally covers
 * the local-database-less demo mode, which has no real identity to
 * resolve and so always reports unavailable.
 */
export function SosButton({ token }: { token: string }) {
  const [available, setAvailable] = useState(false);
  const [state, setState] = useState<SosState>("closed");
  const [message, setMessage] = useState("");
  const [ack, setAck] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/respondent/sos-availability?token=${encodeURIComponent(token)}`)
      .then((response) => response.json())
      .then((data: { ok?: boolean; available?: boolean }) => setAvailable(Boolean(data.ok && data.available)))
      .catch(() => setAvailable(false));
  }, [token]);

  async function submit() {
    if (!message.trim() || !ack) return;
    setState("submitting");
    setError("");
    const response = await fetch("/api/respondent/sos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, message: message.trim(), consentAck: true }),
    });
    const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (data.ok) {
      setState("sent");
    } else {
      setError(data.error ?? "Couldn't send that. Try again.");
      setState("form");
    }
  }

  function close() {
    setState("closed");
    setMessage("");
    setAck(false);
    setError("");
  }

  if (!available) return null;

  return (
    <>
      <button onClick={() => setState("form")} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--red)] hover:underline">
        <LifeBuoy size={13} strokeWidth={1.8} />
        I need help
      </button>

      {state !== "closed" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-[var(--radius-shell)] border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-elevated)]">
            {state === "sent" ? (
              <>
                <h3 className="text-[18px] font-semibold text-[var(--ink)]">Sent</h3>
                <p className="mt-2 text-[13.5px] leading-[1.6] text-[var(--ink-mid)]">
                  Your message was sent to your workspace&apos;s safety contact, along with your name and email. This does not
                  guarantee protection from retaliation -- that depends on your organization&apos;s own policies and applicable law.
                </p>
                <button onClick={close} className="btn-primary mt-5 w-full justify-center py-2.5">
                  Close
                </button>
              </>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-[18px] font-semibold text-[var(--ink)]">I need help</h3>
                  <button onClick={close} aria-label="Close" className="text-[var(--ink-faint)] hover:text-[var(--ink)]">
                    <X size={18} strokeWidth={1.8} />
                  </button>
                </div>
                <p className="mt-2 text-[13px] leading-[1.6] text-[var(--ink-mid)]">This is different from the rest of the survey — sending it means someone will know it was you.</p>

                <ul className="mt-3 space-y-1.5 text-[12.5px] leading-[1.5] text-[var(--ink-mid)]">
                  <li>• Your name and email go to a specific person at your workplace, along with this message.</li>
                  <li>• It stays separate from your anonymous answers and never shows up in any survey results.</li>
                  <li>• It&apos;s a one-time thing, just for this message — the rest of your survey stays anonymous either way.</li>
                  <li className="font-medium text-[var(--ink)]">
                    • It doesn&apos;t guarantee protection from retaliation — that depends on your workplace and local law, not on this form.
                  </li>
                </ul>

                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="What's going on?"
                  aria-label="Message to your safety contact"
                  className="mt-4 min-h-28 w-full rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] p-3 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--green)]"
                />

                <label className="mt-3 flex items-start gap-2 text-[12.5px] leading-[1.5] text-[var(--ink-mid)]">
                  <input type="checkbox" checked={ack} onChange={(event) => setAck(event.target.checked)} className="mt-0.5 h-4 w-4" />
                  I understand and want to send this
                </label>

                {error ? <p className="mt-2 text-[13px] font-medium text-[var(--red)]">{error}</p> : null}

                <button
                  onClick={submit}
                  disabled={!message.trim() || !ack || state === "submitting"}
                  className="btn-primary mt-4 w-full justify-center py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {state === "submitting" ? "Sending..." : "Send to safety contact"}
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

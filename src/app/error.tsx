"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * Root error boundary -- catches render/data errors in any segment that
 * doesn't have its own closer boundary (e.g. src/app/app/error.tsx covers
 * /app/*). Renders inside the existing root layout (html/body already
 * came from src/app/layout.tsx), so a crash anywhere shows a recoverable
 * screen instead of a blank page or Next's default error overlay.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-[var(--radius-card)] border border-[var(--brand-border)] bg-[var(--brand-surface)] p-8 text-center shadow-[var(--shadow-soft)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-amber-soft)] text-[var(--brand-amber)]">
          <AlertTriangle size={22} />
        </div>
        <h1 className="mt-4 text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">
          We hit an unexpected error. Nothing was lost -- try again, or reach us at{" "}
          <a href="mailto:support@safersay.com" className="font-semibold text-[var(--brand-accent)] underline">
            support@safersay.com
          </a>{" "}
          if it keeps happening.
        </p>
        {error.digest ? <p className="mt-3 text-xs text-[var(--brand-ink-faint)]">Reference: {error.digest}</p> : null}
        <button
          onClick={reset}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--brand-accent)] px-6 text-sm font-semibold text-white transition hover:bg-[var(--brand-accent-deep)]"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

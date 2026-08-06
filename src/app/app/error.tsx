"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

/**
 * Scoped to /app/* -- catches errors in the survey/people/workspace
 * screens and gives a recovery path that stays inside the admin (retry,
 * or back to the Surveys home) instead of the generic root fallback.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Admin app error:", error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--brand-bg)] px-4">
      <div className="w-full max-w-md rounded-[var(--radius-card)] border border-[var(--brand-border)] bg-[var(--brand-surface)] p-8 text-center shadow-[var(--shadow-soft)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-amber-soft)] text-[var(--brand-amber)]">
          <AlertTriangle size={22} />
        </div>
        <h1 className="mt-4 text-xl font-semibold">This page hit a snag</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">
          Nothing was changed or lost. Try again, or head back to your surveys. If this keeps happening, email{" "}
          <a href="mailto:support@safersay.com" className="font-semibold text-[var(--brand-accent)] underline">
            support@safersay.com
          </a>
          {error.digest ? ` with reference ${error.digest}` : ""}.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-[var(--brand-accent)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--brand-accent-deep)]"
          >
            <RefreshCw size={15} />
            Try again
          </button>
          <Link
            href="/app"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-pill)] border border-[var(--brand-border)] bg-white px-5 text-sm font-semibold transition hover:bg-[var(--brand-line-soft)]"
          >
            <Home size={15} />
            Surveys home
          </Link>
        </div>
      </div>
    </main>
  );
}

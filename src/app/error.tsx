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
      <div className="card w-full max-w-md text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[var(--red-bg)] text-[var(--red)]">
          <AlertTriangle size={20} strokeWidth={1.8} />
        </div>
        <h1 className="page-title mt-4 text-[18px]">Something went wrong</h1>
        <p className="mt-2 secondary-text">
          We hit an unexpected error. Nothing was lost -- try again, or reach us at{" "}
          <a href="mailto:support@safersay.com" className="font-medium text-[var(--ink)] underline">
            support@safersay.com
          </a>{" "}
          if it keeps happening.
        </p>
        {error.digest ? <p className="mt-3 text-xs text-[var(--ink-faint)]">Reference: {error.digest}</p> : null}
        <button onClick={reset} className="btn-primary mt-6">
          Try again
        </button>
      </div>
    </div>
  );
}

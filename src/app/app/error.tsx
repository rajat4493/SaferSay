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
    <main className="grid min-h-screen place-items-center bg-[var(--bg)] px-4">
      <div className="card w-full max-w-md text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[var(--red-bg)] text-[var(--red)]">
          <AlertTriangle size={20} strokeWidth={1.8} />
        </div>
        <h1 className="page-title mt-4 text-[18px]">This page hit a snag</h1>
        <p className="mt-2 secondary-text">
          Nothing was changed or lost. Try again, or head back to your surveys. If this keeps happening, email{" "}
          <a href="mailto:support@safersay.com" className="font-medium text-[var(--ink)] underline">
            support@safersay.com
          </a>
          {error.digest ? ` with reference ${error.digest}` : ""}.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <button onClick={reset} className="btn-primary">
            <RefreshCw size={14} strokeWidth={1.8} />
            Try again
          </button>
          <Link href="/app" className="btn-secondary">
            <Home size={14} strokeWidth={1.8} />
            Surveys home
          </Link>
        </div>
      </div>
    </main>
  );
}

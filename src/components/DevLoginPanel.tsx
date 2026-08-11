"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Only ever renders when /api/dev/login confirms the bypass is enabled
 * (SAFERSAY_RUNTIME_MODE !== "production" -- see src/lib/server/devAuth.ts).
 * On the real deployment that check 404s, this panel simply never appears.
 */
export function DevLoginPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [available, setAvailable] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dev/login")
      .then((response) => setAvailable(response.ok))
      .catch(() => setAvailable(false));
  }, []);

  async function submit() {
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/dev/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "That email couldn't be used to sign in. Check it and try again.");
        return;
      }
      router.push(searchParams.get("next") ?? "/app");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (!available) return null;

  return (
    <div className="mt-4 rounded-3xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm">
      <p className="font-semibold text-amber-800">Dev login (non-production only)</p>
      <p className="mt-1 text-amber-700">Skips Google/Microsoft OAuth for local testing. Never available on the live production site.</p>
      <div className="mt-3 flex gap-2">
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && submit()}
          placeholder="you@example.com"
          className="h-10 flex-1 rounded-xl border border-amber-300 bg-white px-3 text-sm outline-none"
        />
        <button
          onClick={submit}
          disabled={submitting || !email.trim()}
          className="h-10 shrink-0 rounded-xl bg-amber-800 px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitting ? "..." : "Sign in"}
        </button>
      </div>
      {error ? <p className="mt-2 text-amber-800">{error}</p> : null}
    </div>
  );
}

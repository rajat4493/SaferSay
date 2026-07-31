"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function AdminAccessForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/app";
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const response = await fetch("/api/admin/access", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret }),
    });

    if (!response.ok) {
      setSubmitting(false);
      setError("That access code did not work.");
      return;
    }

    router.replace(nextPath.startsWith("/") ? nextPath : "/app");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-8 grid gap-3">
      <label className="text-sm font-semibold text-[var(--brand-muted)]">
        Admin access code
        <input
          value={secret}
          onChange={(event) => setSecret(event.target.value)}
          type="password"
          autoComplete="current-password"
          className="mt-2 w-full rounded-full border border-[var(--brand-border)] bg-white px-5 py-3 text-[var(--brand-ink)] outline-none focus:border-[var(--brand-accent)]"
        />
      </label>
      {error ? <p className="text-sm font-semibold text-[#9a392d]">{error}</p> : null}
      <button
        type="submit"
        disabled={submitting || secret.length === 0}
        className="rounded-full bg-[var(--brand-ink)] px-5 py-3 text-center text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Checking..." : "Continue"}
      </button>
    </form>
  );
}

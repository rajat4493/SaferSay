"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type Provider = "google" | "azure";

export function OAuthLoginButtons() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/app";
  const [pending, setPending] = useState<Provider | null>(null);
  const [error, setError] = useState("");

  async function signInWith(provider: Provider) {
    setPending(provider);
    setError("");

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath.startsWith("/") ? nextPath : "/app")}`;
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });

    if (signInError) {
      setPending(null);
      setError("Sign-in could not be started. Try again.");
    }
  }

  return (
    <div className="mt-8 grid gap-3">
      <button
        type="button"
        onClick={() => signInWith("google")}
        disabled={pending !== null}
        className="rounded-full border border-[var(--brand-border)] bg-white px-5 py-3 text-center text-sm font-semibold text-[var(--brand-ink)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending === "google" ? "Redirecting..." : "Continue with Google"}
      </button>
      <button
        type="button"
        onClick={() => signInWith("azure")}
        disabled={pending !== null}
        className="rounded-full border border-[var(--brand-border)] bg-white px-5 py-3 text-center text-sm font-semibold text-[var(--brand-ink)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending === "azure" ? "Redirecting..." : "Continue with Microsoft"}
      </button>
      {error ? <p className="text-sm font-semibold text-[#9a392d]">{error}</p> : null}
    </div>
  );
}

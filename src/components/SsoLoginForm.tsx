"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

/**
 * Enterprise SSO sign-in for tenant staff only (customer_admin,
 * survey_creator, auditor, people_leader, integration_admin,
 * compliance_reviewer). Survey respondents never see this -- they don't
 * use /login at all, they open a unique tokenised link
 * (src/app/s/[token]/page.tsx), which has no Supabase Auth session and
 * nothing to do with this form.
 *
 * Supabase resolves signInWithSSO({domain}) against whichever tenant
 * registered that domain as a SAML provider (see
 * src/app/api/tenants/sso/route.ts) -- an admin only needs to type their
 * work email here, not choose a tenant.
 */
export function SsoLoginForm() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/app";
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const domain = email.split("@")[1]?.trim().toLowerCase();
    if (!domain) {
      setError("Enter your work email address.");
      return;
    }
    setPending(true);
    setError("");

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath.startsWith("/") ? nextPath : "/app")}`;
    const { error: signInError } = await supabase.auth.signInWithSSO({ domain, options: { redirectTo } });

    if (signInError) {
      setPending(false);
      setError("Your organization hasn't set up SSO, or something went wrong. Try Google or Microsoft instead.");
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 w-full rounded-full border border-[var(--brand-border)] bg-transparent px-5 py-3 text-center text-sm font-semibold text-[var(--brand-muted)] hover:text-[var(--brand-ink)]"
      >
        Sign in with SSO
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-3 grid gap-2">
      <input
        type="email"
        required
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="admin-input"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-[var(--brand-border)] bg-white px-5 py-3 text-center text-sm font-semibold text-[var(--brand-ink)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Redirecting..." : "Continue with SSO"}
      </button>
      {error ? <p className="text-sm font-semibold text-[#9a392d]">{error}</p> : null}
    </form>
  );
}

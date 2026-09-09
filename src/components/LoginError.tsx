"use client";

import { useSearchParams } from "next/navigation";

const ERROR_MESSAGES: Record<string, string> = {
  disposable_email:
    "That looks like a temporary/disposable email address, which can't be used to create a new workspace. Sign in with a permanent work or personal email instead.",
  signup_rate_limited:
    "Too many new workspaces have been created from this network recently. Please try again later, or get in touch if you need help.",
  rate_limited: "Too many sign-in attempts. Please wait a few minutes and try again.",
  oauth_failed: "Sign-in failed. Please try again.",
};

export function LoginError() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  if (!error) return null;
  const message = ERROR_MESSAGES[error] ?? "Something went wrong signing you in. Please try again.";
  return (
    <div className="mt-4 rounded-3xl border border-[#e7c9c2] bg-[#fbf1ee] p-4 text-sm text-[#9a392d]">
      {message}
    </div>
  );
}

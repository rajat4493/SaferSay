"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--brand-border)] bg-white px-5 text-sm font-semibold text-[var(--brand-ink)]"
    >
      Sign out
    </button>
  );
}

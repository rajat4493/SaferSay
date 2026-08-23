"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await Promise.all([createClient().auth.signOut(), fetch("/api/dev/login", { method: "DELETE" }).catch(() => undefined)]);
    router.replace("/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={signOut} className="btn-secondary btn-pill">
      Sign out
    </button>
  );
}

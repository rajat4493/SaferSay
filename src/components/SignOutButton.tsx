"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export function SignOutButton({ fullWidth = false }: { fullWidth?: boolean }) {
  const router = useRouter();

  async function signOut() {
    await Promise.all([createClient().auth.signOut(), fetch("/api/dev/login", { method: "DELETE" }).catch(() => undefined)]);
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className={`btn-secondary btn-pill ${fullWidth ? "w-full justify-center" : ""}`}
    >
      <LogOut size={13} strokeWidth={1.8} />
      Sign out
    </button>
  );
}

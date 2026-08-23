"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Signed-in users land back in the app, not the marketing homepage --
 * an external DPO/works-council rep with no account gets the homepage
 * instead, since /app would just bounce them to /login anyway.
 */
export function BackToAppLink() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    fetch("/api/tenants/current")
      .then((response) => response.json())
      .then((data: { ok?: boolean }) => setSignedIn(Boolean(data.ok)))
      .catch(() => setSignedIn(false));
  }, []);

  return (
    <Link href={signedIn ? "/app" : "/"} className="inline-flex items-center gap-1.5 secondary-text font-medium hover:text-[var(--ink)]">
      <ArrowLeft size={14} strokeWidth={1.8} />
      {signedIn ? "Back to SaferSay" : "Back to safersay.com"}
    </Link>
  );
}

"use client";

import { Suspense } from "react";
import { BrandMark } from "@/components/BrandMark";
import { useBrand } from "@/components/BrandProvider";
import { OAuthLoginButtons } from "@/components/OAuthLoginButtons";

export default function LoginPage() {
  const { brand } = useBrand();
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--brand-bg)] p-4">
      <section className="w-full max-w-md rounded-[2rem] border border-[var(--brand-border)] bg-white/75 p-6 shadow-[0_30px_90px_rgba(22,22,22,0.12)]">
        <div className="flex items-center gap-3">
          <BrandMark />
          <div><h1 className="text-xl font-semibold">{brand.name}</h1><p className="text-sm text-[var(--brand-muted)]">Sign in to launch a survey</p></div>
        </div>
        <Suspense fallback={<div className="mt-8 h-28 rounded-3xl bg-[var(--brand-bg)]" />}>
          <OAuthLoginButtons />
        </Suspense>
        <div className="mt-5 rounded-3xl border border-[var(--brand-border)] bg-[var(--brand-bg)] p-4 text-sm leading-6 text-[var(--brand-muted)]">
          Your first sign-in creates your organisation&apos;s workspace automatically.
        </div>
      </section>
    </main>
  );
}

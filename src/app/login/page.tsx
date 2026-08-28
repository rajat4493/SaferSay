"use client";

import { Suspense } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { useBrand } from "@/components/BrandProvider";
import { DevLoginPanel } from "@/components/DevLoginPanel";
import { OAuthLoginButtons } from "@/components/OAuthLoginButtons";
import { SsoLoginForm } from "@/components/SsoLoginForm";

export default function LoginPage() {
  const { brand } = useBrand();
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-[var(--brand-ink)] p-12 text-white lg:flex">
        <Link href="/" className="flex items-center gap-3">
          <BrandMark />
          <span className="font-semibold">{brand.name}</span>
        </Link>
        <div>
          <div className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-white/15 bg-white/10 px-3 py-2 text-sm font-medium text-white/70">
            <ShieldCheck size={15} />
            Confidential by design
          </div>
          <h1 className="mt-6 max-w-md text-5xl font-semibold leading-[0.95] tracking-[-0.04em]">
            Say the <span className="text-[var(--brand-accent-soft)]">unsayable.</span>
          </h1>
        </div>
        <p className="text-sm text-white/50">Your first sign-in creates your organisation&apos;s workspace automatically.</p>
      </section>

      <section className="grid place-items-center bg-[var(--brand-bg)] p-4">
        <div className="w-full max-w-md rounded-[var(--radius-shell)] border border-[var(--brand-border)] bg-white/75 p-6 shadow-[var(--shadow-elevated)]">
          <div className="flex items-center gap-3 lg:hidden">
            <BrandMark />
            <div>
              <h1 className="text-xl font-semibold">{brand.name}</h1>
              <p className="text-sm text-[var(--brand-muted)]">Sign in to launch a survey</p>
            </div>
          </div>
          <h2 className="hidden text-xl font-semibold lg:block">Sign in to launch a survey</h2>
          <Suspense fallback={<div className="mt-8 h-28 rounded-3xl bg-[var(--brand-bg)]" />}>
            <OAuthLoginButtons />
          </Suspense>
          <Suspense fallback={null}>
            <SsoLoginForm />
          </Suspense>
          <Suspense fallback={null}>
            <DevLoginPanel />
          </Suspense>
          <div className="mt-5 rounded-3xl border border-[var(--brand-border)] bg-[var(--brand-bg)] p-4 text-sm leading-6 text-[var(--brand-muted)] lg:hidden">
            Your first sign-in creates your organisation&apos;s workspace automatically.
          </div>
        </div>
      </section>
    </main>
  );
}

"use client";

import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { useBrand } from "@/components/BrandProvider";

export default function LoginPage() {
  const { brand } = useBrand();
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--brand-bg)] p-4">
      <section className="w-full max-w-md rounded-[2rem] border border-[var(--brand-border)] bg-white/75 p-6 shadow-[0_30px_90px_rgba(22,22,22,0.12)]">
        <div className="flex items-center gap-3">
          <BrandMark />
          <div><h1 className="text-xl font-semibold">{brand.name}</h1><p className="text-sm text-[var(--brand-muted)]">Sign in to launch a survey</p></div>
        </div>
        <div className="mt-8 grid gap-3">
          <Link href="/app" className="rounded-full bg-[var(--brand-ink)] px-5 py-3 text-center text-sm font-semibold text-white">Continue with Google</Link>
          <Link href="/app" className="rounded-full border border-[var(--brand-border)] bg-white px-5 py-3 text-center text-sm font-semibold">Continue with Microsoft</Link>
        </div>
      </section>
    </main>
  );
}

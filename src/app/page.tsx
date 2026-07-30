"use client";

import { ArrowRight, EyeOff, Power, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { useBrand } from "@/components/BrandProvider";

export default function Home() {
  const { brand } = useBrand();

  return (
    <main className="min-h-screen bg-[var(--brand-bg)] text-[var(--brand-ink)]">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between rounded-full border border-white/80 bg-white/75 px-4 py-3 shadow-[0_20px_70px_rgba(22,22,22,0.08)]">
          <div className="flex items-center gap-3">
            <BrandMark />
            <div>
              <div className="font-semibold leading-none">{brand.name}</div>
              <div className="mt-1 text-xs text-[var(--brand-muted)]">{brand.tagline}</div>
            </div>
          </div>
          <Link href="/login" className="rounded-full bg-[var(--brand-ink)] px-5 py-3 text-sm font-semibold text-white">
            Login
          </Link>
        </nav>

        <div className="grid flex-1 gap-8 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <section>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-border)] bg-white/75 px-3 py-2 text-sm font-medium text-[var(--brand-muted)]">
              <ShieldCheck size={15} />
              Confidential employee surveys for SMEs
            </div>
            <h1 className="mt-7 max-w-3xl text-5xl font-semibold leading-[0.94] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Premium feedback without enterprise drag.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--brand-muted)]">
              Template-first launch, plain-English confidentiality, protected reporting,
              exportable data, and one-place client rebranding.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/app" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--brand-accent)] px-6 text-sm font-semibold text-white">
                Open app
                <ArrowRight size={17} />
              </Link>
              <Link href="/app/brand" className="inline-flex h-12 items-center justify-center rounded-full border border-[var(--brand-border)] bg-white/70 px-6 text-sm font-semibold">
                Customize brand
              </Link>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <Value icon={ArrowRight} title="Easy to start" text="Three setup steps, defaults selected, template-first." />
            <Value icon={EyeOff} title="Easy to understand" text="Respondents see what is stored and what HR cannot see." />
            <Value icon={Power} title="Easy to leave" text="Export and cancel are visible. No data hostage pattern." />
          </section>
        </div>
      </section>
    </main>
  );
}

function Value({ icon: Icon, title, text }: { icon: typeof ArrowRight; title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-[var(--brand-border)] bg-white/70 p-5 shadow-sm">
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--brand-accent-soft)] text-[var(--brand-accent)]">
        <Icon size={18} />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">{text}</p>
    </div>
  );
}

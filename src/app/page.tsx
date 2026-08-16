"use client";

import { useEffect, useState } from "react";
import { ArrowRight, EyeOff, Power, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { useBrand } from "@/components/BrandProvider";

const tickerItems = ["Easy to start.", "Easy to leave.", "Easy to understand.", "Confidential by design."];

export default function Home() {
  const { brand } = useBrand();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    fetch("/api/tenants/current")
      .then((response) => response.json())
      .then((data: { ok?: boolean }) => setSignedIn(Boolean(data.ok)))
      .catch(() => setSignedIn(false));
  }, []);

  return (
    <main className="min-h-screen bg-[var(--brand-ink)] text-white">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between rounded-[var(--radius-pill)] border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <BrandMark />
            <div>
              <div className="font-semibold leading-none">{brand.name}</div>
              <div className="mt-1 text-xs text-white/60">{brand.tagline}</div>
            </div>
          </div>
          <Link
            href={signedIn ? "/app" : "/login"}
            className="rounded-[var(--radius-pill)] bg-white px-5 py-3 text-sm font-semibold text-[var(--brand-ink)]"
          >
            {signedIn ? "Go to app" : "Login"}
          </Link>
        </nav>

        <div className="flex flex-1 flex-col justify-center gap-8 py-16">
          <div className="inline-flex w-fit items-center gap-2 rounded-[var(--radius-pill)] border border-white/15 bg-white/10 px-3 py-2 text-sm font-medium text-white/70">
            <ShieldCheck size={15} />
            Confidential employee surveys for SMEs
          </div>
          <h1 className="max-w-5xl font-[family-name:var(--font-display)] text-6xl font-semibold leading-[0.9] tracking-[-0.03em] sm:text-8xl lg:text-[8.5rem]">
            Say the
            <br />
            <span className="text-[var(--brand-accent-soft)]">unsayable.</span>
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-white/70">
            Premium employee feedback without enterprise drag. Template-first launch, plain-English
            confidentiality, protected reporting, and one-place client rebranding.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={signedIn ? "/app" : "/login"}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-[var(--brand-accent)] px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5"
            >
              {signedIn ? "Open app" : "Get started"}
              <ArrowRight size={17} />
            </Link>
            <Link href="/app/brand" className="inline-flex h-12 items-center justify-center rounded-[var(--radius-pill)] border border-white/20 bg-white/5 px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10">
              Customize brand
            </Link>
          </div>
        </div>
      </section>

      {/* Decorative and fully duplicative of the three value cards below --
          aria-hidden so a screen reader doesn't read the same four phrases
          twice back to back with no indication it's just a scroll loop. */}
      <div className="overflow-hidden border-y border-white/10 bg-white/5 py-4" aria-hidden="true">
        <div className="flex w-max animate-marquee gap-16 whitespace-nowrap text-sm font-semibold uppercase tracking-[0.2em] text-white/50">
          {[...tickerItems, ...tickerItems].map((item, index) => (
            <span key={`${item}-${index}`}>{item}</span>
          ))}
        </div>
      </div>

      <section className="bg-[var(--brand-bg)] px-4 py-20 text-[var(--brand-ink)] sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
          <Value icon={ArrowRight} title="Easy to start" text="Three setup steps, defaults selected, template-first." />
          <Value icon={EyeOff} title="Easy to understand" text="Respondents see what is stored and what HR cannot see." />
          <Value icon={Power} title="Easy to leave" text="Export and cancel are visible. No data hostage pattern." />
        </div>
      </section>
    </main>
  );
}

function Value({ icon: Icon, title, text }: { icon: typeof ArrowRight; title: string; text: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--brand-border)] bg-white/70 p-6 shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-elevated)]">
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--brand-accent-soft)] text-[var(--brand-accent)]">
        <Icon size={18} />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">{text}</p>
    </div>
  );
}

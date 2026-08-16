"use client";

import { Building2, FileText, Home, Menu, MessageSquareText, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { useBrand } from "@/components/BrandProvider";

const nav = [
  { href: "/viewer", label: "Overview", icon: Home },
  { href: "/viewer/org", label: "Organisation", icon: Building2 },
  { href: "/viewer/team", label: "My team", icon: Users },
  { href: "/viewer/comments", label: "Comments", icon: MessageSquareText },
  { href: "/viewer/actions", label: "Actions", icon: FileText },
];

export function ViewerShell({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) {
  const pathname = usePathname();
  const { brand } = useBrand();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark />
          <div>
            <span className="text-[16px] font-semibold leading-none text-[var(--ink)]">{brand.name}</span>
            <p className="mt-0.5 text-[11px] text-[var(--ink-faint)]">Viewer portal</p>
          </div>
        </Link>
        <button onClick={() => setMobileNavOpen(false)} aria-label="Close menu" className="text-[var(--ink-mid)] lg:hidden">
          <X size={18} strokeWidth={1.8} />
        </button>
      </div>
      <nav className="flex-1 px-2.5 py-2">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileNavOpen(false)}
              className={`flex items-center gap-2.5 rounded-[var(--radius-pill)] px-2.5 py-[7px] text-[13px] transition ${
                active ? "bg-[var(--bg-active)] font-medium text-[var(--green)]" : "font-normal text-[var(--ink-mid)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink)]"
              }`}
            >
              <item.icon size={15} strokeWidth={1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-[var(--bg-active)] px-4 py-3">
        <Link href="/app" className="secondary-text font-medium text-[var(--ink-mid)] hover:text-[var(--ink)]">
          ← Back to admin
        </Link>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <aside className="sticky top-0 hidden h-screen w-[200px] shrink-0 flex-col border-r border-[var(--border)] bg-white lg:flex">{sidebarContent}</aside>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileNavOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[240px] flex-col border-r border-[var(--border)] bg-white">{sidebarContent}</aside>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto px-4 py-7 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 flex items-start justify-between gap-3 border-b border-[var(--border)] pb-5">
            <div>
              <p className="meta-label">Protected view</p>
              <h1 className="page-title mt-2">{title}</h1>
              <p className="mt-1.5 secondary-text">{subtitle}</p>
            </div>
            <button onClick={() => setMobileNavOpen(true)} aria-label="Open menu" className="mt-1 shrink-0 text-[var(--ink-mid)] lg:hidden">
              <Menu size={18} strokeWidth={1.8} />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export function ViewerCard({ children }: { children: React.ReactNode }) {
  return <div className="card">{children}</div>;
}

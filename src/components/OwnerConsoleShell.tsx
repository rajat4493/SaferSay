"use client";

import {
  Activity,
  Bell,
  CreditCard,
  LayoutGrid,
  Menu,
  Rocket,
  Search,
  Settings,
  Sliders,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SignOutButton } from "@/components/SignOutButton";

const navItems = [
  { href: "/console", label: "Overview", icon: LayoutGrid },
  { href: "/console/tenants", label: "Tenants", icon: Users },
  { href: "/console/billing", label: "Billing", icon: CreditCard },
  { href: "/console/usage", label: "Usage & Health", icon: Activity },
  { href: "/console/plans", label: "Plans & Features", icon: Sliders },
  { href: "/console/support", label: "Support & Alerts", icon: Bell },
  { href: "/console/readiness", label: "Readiness", icon: Rocket },
  { href: "/console/settings", label: "Settings", icon: Settings },
];

export function OwnerConsoleShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchDraft, setSearchDraft] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Reflects SAFERSAY_RUNTIME_MODE (server-only), not NODE_ENV -- Vercel
  // builds set NODE_ENV=production on every deployment including preview,
  // so that check always said "Production" regardless of runtime mode.
  const [environment, setEnvironment] = useState<"Production" | "Development" | null>(null);

  useEffect(() => {
    fetch("/api/readiness")
      .then((response) => response.json())
      .then((data: { mode?: string }) => setEnvironment(data.mode === "production" ? "Production" : "Development"))
      .catch(() => undefined);
  }, []);

  function runSearch() {
    const query = searchDraft.trim();
    router.push(query ? `/console/tenants?q=${encodeURIComponent(query)}` : "/console/tenants");
  }

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2.5">
          {/* Always the platform's own mark, never a tenant's Brand Studio logo -- this console is not white-labeled. */}
          <Image src="/safersay-mark.svg" alt="SaferSay" width={22} height={22} className="rounded-[6px]" />
          <span className="text-[14px] font-semibold leading-none text-[var(--ink)]">Console</span>
        </div>
        <button onClick={() => setMobileNavOpen(false)} aria-label="Close menu" className="text-[var(--ink-mid)] lg:hidden">
          <X size={18} strokeWidth={1.8} />
        </button>
      </div>
      <nav className="flex-1 px-2.5 py-2">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileNavOpen(false)}
              className={`flex items-center gap-2.5 rounded-[var(--radius-input)] px-2.5 py-[7px] text-[13px] transition ${
                active ? "bg-[var(--bg-active)] font-medium text-[var(--ink)]" : "font-normal text-[var(--ink-mid)] hover:bg-[var(--bg-hover)] hover:text-[var(--ink)]"
              }`}
            >
              <item.icon size={15} strokeWidth={1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-[var(--bg-active)] px-4 py-3">
        <p className="text-[11.5px] text-[var(--ink-faint)]">Platform Owner</p>
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

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--border)] bg-white px-4 py-[11px] sm:gap-4 sm:px-6">
          <button onClick={() => setMobileNavOpen(true)} aria-label="Open menu" className="shrink-0 text-[var(--ink-mid)] lg:hidden">
            <Menu size={18} strokeWidth={1.8} />
          </button>
          {environment ? (
            <span
              className={`hidden shrink-0 items-center gap-1.5 rounded-[var(--radius-pill)] border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] sm:inline-flex ${
                environment === "Production" ? "border-[var(--green-border)] bg-[var(--green-bg)] text-[var(--green)]" : "border-[var(--border)] bg-[var(--bg-active)] text-[var(--ink-mid)]"
              }`}
            >
              {environment}
            </span>
          ) : null}
          <div className="relative max-w-md flex-1">
            <Search size={14} strokeWidth={1.8} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-faint)]" />
            <input
              type="text"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && runSearch()}
              placeholder="Search tenants..."
              aria-label="Search tenants"
              className="admin-input h-9 pl-8"
            />
          </div>
          <SignOutButton />
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

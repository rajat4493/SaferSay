"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ConsoleCard, formatRelative } from "@/components/console/ConsoleUI";

type Attention = { tenantId: string; tenantName: string; kind: string; detail: string };
type Note = { id: string; tenantId: string; tenantName: string; authorEmail: string; note: string; createdAt: string };

export function SupportAlertsPanel() {
  const [attention, setAttention] = useState<Attention[] | null>(null);
  const [notes, setNotes] = useState<Note[] | null>(null);

  useEffect(() => {
    fetch("/api/super-admin/overview")
      .then((response) => response.json())
      .then((data) => setAttention(data.ok ? data.overview.attention : []))
      .catch(() => setAttention([]));
    fetch("/api/super-admin/support-notes")
      .then((response) => response.json())
      .then((data) => setNotes(data.ok ? data.notes : []))
      .catch(() => setNotes([]));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Support & Alerts</h1>

      <ConsoleCard>
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brand-muted)]">System alerts</h2>
        <div className="mt-3 space-y-2">
          {attention === null ? (
            <p className="text-sm text-[var(--brand-muted)]">Loading...</p>
          ) : attention.length === 0 ? (
            <p className="text-sm text-[var(--brand-muted)]">No alerts right now.</p>
          ) : (
            attention.map((item, index) => (
              <Link
                key={`${item.tenantId}-${item.kind}-${index}`}
                href={`/console/tenants/${item.tenantId}`}
                className="block rounded-xl border border-[var(--brand-border)] px-3 py-2 text-sm hover:bg-black/[0.02]"
              >
                <span className="font-semibold">{item.tenantName}</span> — {item.detail}
              </Link>
            ))
          )}
        </div>
      </ConsoleCard>

      <ConsoleCard>
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brand-muted)]">Support inbox</h2>
        <p className="mt-1 text-xs text-[var(--brand-muted)]">
          Ops notes across all tenants, newest first. Add notes from a tenant&apos;s detail page.
        </p>
        <div className="mt-3 space-y-2">
          {notes === null ? (
            <p className="text-sm text-[var(--brand-muted)]">Loading...</p>
          ) : notes.length === 0 ? (
            <p className="text-sm text-[var(--brand-muted)]">No support notes yet. Tenants have no in-app way to raise issues yet.</p>
          ) : (
            notes.map((note) => (
              <Link
                key={note.id}
                href={`/console/tenants/${note.tenantId}`}
                className="block rounded-xl border border-[var(--brand-border)] px-3 py-2 text-sm hover:bg-black/[0.02]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{note.tenantName}</span>
                  <span className="text-xs text-[var(--brand-muted)]">{formatRelative(note.createdAt)}</span>
                </div>
                <p className="mt-1 text-[var(--brand-muted)]">{note.note}</p>
              </Link>
            ))
          )}
        </div>
      </ConsoleCard>
    </div>
  );
}

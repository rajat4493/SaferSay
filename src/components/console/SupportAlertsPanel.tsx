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
    <div className="space-y-[9px]">
      <h1 className="page-title">Support &amp; Alerts</h1>

      <ConsoleCard>
        <h2 className="meta-label">System alerts</h2>
        <div className="mt-3 space-y-2">
          {attention === null ? (
            <p className="secondary-text">Loading...</p>
          ) : attention.length === 0 ? (
            <p className="secondary-text">No alerts right now.</p>
          ) : (
            attention.map((item, index) => (
              <Link key={`${item.tenantId}-${item.kind}-${index}`} href={`/console/tenants/${item.tenantId}`} className="card card-interactive block text-[13px]">
                <span className="font-medium text-[var(--ink)]">{item.tenantName}</span> <span className="text-[var(--ink-mid)]">— {item.detail}</span>
              </Link>
            ))
          )}
        </div>
      </ConsoleCard>

      <ConsoleCard>
        <h2 className="meta-label">Support inbox</h2>
        <p className="mt-1 text-xs text-[var(--ink-faint)]">Ops notes across all tenants, newest first. Add notes from a tenant&apos;s detail page.</p>
        <div className="mt-3 space-y-2">
          {notes === null ? (
            <p className="secondary-text">Loading...</p>
          ) : notes.length === 0 ? (
            <p className="secondary-text">No support notes yet. Tenants have no in-app way to raise issues yet.</p>
          ) : (
            notes.map((note) => (
              <Link key={note.id} href={`/console/tenants/${note.tenantId}`} className="card card-interactive block text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[var(--ink)]">{note.tenantName}</span>
                  <span className="text-xs text-[var(--ink-faint)]">{formatRelative(note.createdAt)}</span>
                </div>
                <p className="mt-1 text-[var(--ink-mid)]">{note.note}</p>
              </Link>
            ))
          )}
        </div>
      </ConsoleCard>
    </div>
  );
}

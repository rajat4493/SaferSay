"use client";

import { useCallback, useEffect, useState } from "react";
import { Users } from "lucide-react";
import { Card } from "@/components/AppShell";
import { SkeletonRow } from "@/components/Skeleton";

type Team = { team: string; memberCount: number };

export function GroupsPanel() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [mergeTarget, setMergeTarget] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/employee-teams");
    const result = (await response.json().catch(() => ({}))) as { ok?: boolean; teams?: Team[] };
    if (result.ok) setTeams(result.teams ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => load(), 0);
    return () => clearTimeout(timeout);
  }, [load]);

  function toggleSelected(team: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(team)) next.delete(team);
      else next.add(team);
      return next;
    });
  }

  async function rename(team: string) {
    const toTeam = renameValue.trim();
    if (!toTeam) return;
    setSaving(true);
    setStatus("");
    const response = await fetch("/api/employee-teams", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fromTeam: team, toTeam }),
    });
    const result = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; updated?: number };
    setSaving(false);
    if (!response.ok || !result.ok) {
      setStatus(result.error ?? "Couldn't rename that group.");
      return;
    }
    setStatus(`Renamed "${team}" to "${toTeam}" (${result.updated} people).`);
    setRenameTarget(null);
    setRenameValue("");
    await load();
  }

  async function merge() {
    const toTeam = mergeTarget.trim();
    if (!toTeam || selected.size === 0) return;
    setSaving(true);
    setStatus("");
    const response = await fetch("/api/employee-teams", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fromTeams: Array.from(selected), toTeam }),
    });
    const result = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; updated?: number };
    setSaving(false);
    if (!response.ok || !result.ok) {
      setStatus(result.error ?? "Couldn't merge those groups.");
      return;
    }
    setStatus(`Merged ${selected.size} groups into "${toTeam}" (${result.updated} people moved).`);
    setSelected(new Set());
    setMergeTarget("");
    await load();
  }

  return (
    <Card className="mt-[9px]">
      <div className="flex items-center gap-2">
        <Users size={16} strokeWidth={1.8} className="text-[var(--ink-mid)]" />
        <h2 className="section-title">Groups</h2>
      </div>
      <p className="mt-1 secondary-text">
        Groups come from the &quot;team&quot; column on import. Rename a group, or select several and merge them into one.
      </p>

      {selected.size > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-[var(--bg)] p-3">
          <span className="secondary-text">{selected.size} selected &rarr; merge into</span>
          <input
            value={mergeTarget}
            onChange={(event) => setMergeTarget(event.target.value)}
            placeholder="Target group name"
            aria-label="Target group name"
            className="admin-input h-9 min-w-0 flex-1"
          />
          <button onClick={merge} disabled={saving || !mergeTarget.trim()} className="btn-primary h-9 shrink-0">
            {saving ? "Merging..." : "Merge"}
          </button>
          <button onClick={() => setSelected(new Set())} className="btn-secondary h-9 shrink-0">
            Clear
          </button>
        </div>
      ) : null}

      {status ? <p className="mt-3 secondary-text font-medium">{status}</p> : null}

      <div className="mt-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-white">
        {loading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : teams.length === 0 ? (
          <p className="p-4 secondary-text">No groups yet. Import employees with a &quot;team&quot; column to create them.</p>
        ) : (
          teams.map((team) => (
            <div key={team.team} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-[var(--border)] p-3 text-[13px] last:border-b-0">
              <input
                type="checkbox"
                checked={selected.has(team.team)}
                onChange={() => toggleSelected(team.team)}
                aria-label={`Select ${team.team}`}
                className="h-4 w-4"
              />
              <div>
                <div className="font-medium capitalize text-[var(--ink)]">{team.team}</div>
                <div className="text-[var(--ink-mid)]">{team.memberCount} people</div>
              </div>
              {renameTarget === team.team ? (
                <div className="flex items-center gap-2">
                  <input
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    placeholder="New name"
                    aria-label={`Rename ${team.team}`}
                    className="admin-input h-8 w-40"
                  />
                  <button onClick={() => rename(team.team)} disabled={saving || !renameValue.trim()} className="btn-primary h-8 px-3 text-xs">
                    Save
                  </button>
                  <button onClick={() => setRenameTarget(null)} className="btn-secondary h-8 px-3 text-xs">
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setRenameTarget(team.team);
                    setRenameValue(team.team);
                  }}
                  className="btn-secondary px-3 py-1.5 text-xs"
                >
                  Rename
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

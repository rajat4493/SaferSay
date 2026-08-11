"use client";

import { useEffect, useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import { Card } from "@/components/AppShell";
import { SkeletonRow } from "@/components/Skeleton";
import { useToast } from "@/components/ToastProvider";
import type { TeamRole, UserRole } from "@/lib/server/repositories/types";

type TeamMember = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  status: "active" | "pending";
  createdAt: string;
};

const roleLabels: Record<string, string> = {
  customer_admin: "HR Admin",
  survey_creator: "Survey Creator",
  auditor: "Viewer",
  employee: "Employee",
};

const inviteRoles: Array<{ value: TeamRole; label: string }> = [
  { value: "customer_admin", label: "HR Admin" },
  { value: "survey_creator", label: "Survey Creator" },
  { value: "auditor", label: "Viewer" },
];

export function TeamPanel() {
  const [team, setTeam] = useState<TeamMember[] | null>(null);
  const [selfId, setSelfId] = useState("");
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("survey_creator");
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState("");
  const [, startTransition] = useTransition();
  const toast = useToast();

  async function load() {
    setLoading(true);
    const response = await fetch("/api/tenants/team");
    const data = (await response.json().catch(() => ({ ok: false }))) as { ok?: boolean; team?: TeamMember[]; selfId?: string };
    if (data.ok) {
      setTeam(data.team ?? []);
      setSelfId(data.selfId ?? "");
    }
    setLoading(false);
  }

  useEffect(() => {
    startTransition(() => {
      void load();
    });
  }, []);

  async function invite() {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    setInviting(true);
    const response = await fetch("/api/tenants/team/invite", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, role: inviteRole }),
    });
    const data = (await response.json().catch(() => ({ ok: false }))) as { ok?: boolean; team?: TeamMember[]; error?: string };
    setInviting(false);
    if (!data.ok) {
      toast.show({ variant: "error", message: data.error ?? "Couldn't send that invite." });
      return;
    }
    setInviteEmail("");
    setTeam(data.team ?? null);
    toast.show({ variant: "success", message: `Invited ${email}.` });
  }

  async function remove(member: TeamMember) {
    const label = member.status === "pending" ? `the invite for ${member.email}` : member.email;
    if (!window.confirm(`Remove ${label} from the team?`)) return;
    setRemovingId(member.id);
    const response = await fetch(`/api/tenants/team/${member.id}/remove`, { method: "POST" });
    const data = (await response.json().catch(() => ({ ok: false }))) as { ok?: boolean; team?: TeamMember[]; error?: string };
    setRemovingId("");
    if (!data.ok) {
      toast.show({ variant: "error", message: data.error ?? "Couldn't remove that team member." });
      return;
    }
    setTeam(data.team ?? null);
  }

  return (
    <Card className="mt-[9px]">
      <h2 className="section-title">Team</h2>
      <p className="mt-1 secondary-text">Invite teammates by email and role. They get that role&apos;s access the moment they sign in with that email.</p>

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-[var(--bg)] p-3">
        <input
          value={inviteEmail}
          onChange={(event) => setInviteEmail(event.target.value)}
          placeholder="teammate@company.com"
          aria-label="Teammate's email to invite"
          className="admin-input h-9 min-w-0 flex-1"
        />
        <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as TeamRole)} className="admin-input h-9 w-auto shrink-0">
          {inviteRoles.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
        <button onClick={invite} disabled={inviting || !inviteEmail.trim()} className="btn-primary h-9 shrink-0">
          <UserPlus size={13} strokeWidth={1.8} />
          {inviting ? "Inviting..." : "Invite"}
        </button>
      </div>

      <div className="mt-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-white">
        {loading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : !team || team.length === 0 ? (
          <p className="p-4 secondary-text">No teammates yet.</p>
        ) : (
          team.map((member) => (
            <div key={member.id} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-[var(--border)] p-3 text-[13px] last:border-b-0">
              <div>
                <div className="font-medium text-[var(--ink)]">{member.name || member.email}</div>
                <div className="text-[var(--ink-mid)]">{member.email}</div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-[var(--radius-pill)] border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] ${
                    member.status === "pending"
                      ? "border-[var(--border)] bg-[var(--bg-active)] text-[var(--ink-mid)]"
                      : "border-[var(--green-border)] bg-[var(--green-bg)] text-[var(--green)]"
                  }`}
                >
                  {member.status === "pending" ? "Invited" : "Active"}
                </span>
                <span className="secondary-text">{roleLabels[member.role] ?? member.role}</span>
                {member.id === selfId ? null : (
                  <button onClick={() => remove(member)} disabled={removingId === member.id} className="btn-secondary px-3 py-1.5 text-xs">
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <p className="mt-5 meta-label">What will they see?</p>
      <div className="mt-2 overflow-x-auto rounded-[var(--radius-card)] border border-[var(--border)]">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-[var(--border)] text-[var(--ink-faint)]">
              <th className="p-3 font-medium">Role</th>
              <th className="p-3 font-medium">Surveys</th>
              <th className="p-3 font-medium">People</th>
              <th className="p-3 font-medium">Reports</th>
              <th className="p-3 font-medium">Workspace</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[var(--border)] text-[var(--ink-mid)] last:border-b-0">
              <td className="p-3 font-medium text-[var(--ink)]">HR Admin</td>
              <td className="p-3">Full</td>
              <td className="p-3">Full</td>
              <td className="p-3">Full</td>
              <td className="p-3">Full</td>
            </tr>
            <tr className="border-b border-[var(--border)] text-[var(--ink-mid)] last:border-b-0">
              <td className="p-3 font-medium text-[var(--ink)]">Survey Creator</td>
              <td className="p-3">Full</td>
              <td className="p-3">Full</td>
              <td className="p-3">Full</td>
              <td className="p-3">—</td>
            </tr>
            <tr className="text-[var(--ink-mid)]">
              <td className="p-3 font-medium text-[var(--ink)]">Viewer</td>
              <td className="p-3">View only</td>
              <td className="p-3">—</td>
              <td className="p-3">View only</td>
              <td className="p-3">—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}

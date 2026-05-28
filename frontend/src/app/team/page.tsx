"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { Reveal } from "@/components/reveal";
import { ActivityFeed } from "@/components/activity-feed";
import { useAuth } from "@/lib/auth";
import {
  TeamResponse,
  TeamMemberResponse,
  TeamInviteResponse,
  TeamRole,
  getCurrentTeam,
  listTeamMembers,
  listTeamInvites,
  createTeamInvite,
  revokeTeamInvite,
  updateMemberRole,
  removeMember,
} from "@/lib/api";

const ROLE_LABELS: Record<TeamRole, string> = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

const ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  owner: "Full control, including billing and ownership transfer",
  admin: "Manage members, invites, and all tender data",
  editor: "Create, edit, and generate proposals",
  viewer: "Read-only access to tenders and proposals",
};

const SEAT_LIMITS: Record<string, number | "unlimited"> = {
  trial: 1,
  starter: 1,
  growth: 5,
  enterprise: "unlimited",
};

export default function TeamPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [team, setTeam] = useState<TeamResponse | null>(null);
  const [members, setMembers] = useState<TeamMemberResponse[]>([]);
  const [invites, setInvites] = useState<TeamInviteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("editor");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/signin");
  }, [authLoading, user, router]);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const [t, m, i] = await Promise.all([
        getCurrentTeam(),
        listTeamMembers(),
        listTeamInvites(),
      ]);
      setTeam(t);
      setMembers(m);
      setInvites(i);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load team");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const currentRole: TeamRole =
    members.find((m) => m.is_current_user)?.role ?? "viewer";
  const canManage = currentRole === "owner" || currentRole === "admin";
  const seatLimit = team ? SEAT_LIMITS[team.plan] ?? "unlimited" : "unlimited";
  const seatsUsed = members.length + invites.length;
  const seatsRemaining =
    seatLimit === "unlimited" ? Infinity : Math.max(0, seatLimit - seatsUsed);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setSending(true);
    try {
      await createTeamInvite(inviteEmail.trim(), inviteRole);
      setInviteEmail("");
      setInviteRole("editor");
      showToast(`Invite sent to ${inviteEmail}`);
      await refresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to send invite");
    } finally {
      setSending(false);
    }
  };

  const handleRevoke = async (inviteId: string, email: string) => {
    if (!confirm(`Revoke invite for ${email}?`)) return;
    try {
      await revokeTeamInvite(inviteId);
      showToast("Invite revoked");
      await refresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to revoke");
    }
  };

  const handleRoleChange = async (userId: string, role: TeamRole) => {
    try {
      await updateMemberRole(userId, role);
      showToast("Role updated");
      await refresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to update role");
    }
  };

  const handleRemove = async (userId: string, email: string) => {
    if (!confirm(`Remove ${email} from the team?`)) return;
    try {
      await removeMember(userId);
      showToast("Member removed");
      await refresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to remove");
    }
  };

  if (authLoading || !user) {
    return (
      <main className="flex-1 flex items-center justify-center bg-stone-50 dark:bg-stone-950">
        <div className="animate-spin h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </main>
    );
  }

  return (
    <main className="flex-1 bg-mesh min-h-screen">
      <SiteNav />

      {toast && (
        <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-top-2">
          <div className="rounded-xl bg-stone-900 text-white text-sm px-4 py-3 shadow-xl ring-1 ring-stone-700">
            {toast}
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-6 py-10">
        <Reveal>
          <div className="mb-8">
            <Link
              href="/account"
              className="text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
            >
              ← Back to account
            </Link>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-950 dark:text-stone-50">
              Team & members
            </h1>
            <p className="mt-2 text-stone-600 dark:text-stone-400">
              Invite colleagues to collaborate on tenders, proposals, and reviews.
            </p>
          </div>
        </Reveal>

        {error && (
          <div className="mb-6 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-4 py-3 text-sm text-rose-900 dark:text-rose-200">
            {error}
          </div>
        )}

        {loading || !team ? (
          <div className="rounded-2xl bg-white dark:bg-stone-900 ring-1 ring-stone-200 dark:ring-stone-800 p-10 text-center text-stone-500">
            <div className="inline-block animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* Team summary */}
            <Reveal>
              <section className="rounded-2xl bg-white dark:bg-stone-900 ring-1 ring-stone-200 dark:ring-stone-800 p-6 mb-6">
                <div className="flex items-start justify-between gap-6 flex-wrap">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-stone-500">Workspace</div>
                    <div className="mt-1 text-xl font-semibold text-stone-950 dark:text-stone-50">
                      {team.name}
                    </div>
                    <div className="mt-1 text-sm text-stone-600 dark:text-stone-400">
                      Plan: <span className="font-medium capitalize">{team.plan}</span>
                      {team.plan_status !== "active" && (
                        <span className="ml-2 text-amber-700 dark:text-amber-400">
                          ({team.plan_status})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-wider text-stone-500">Seats</div>
                    <div className="mt-1 text-xl font-semibold text-stone-950 dark:text-stone-50">
                      {seatsUsed}
                      {seatLimit !== "unlimited" && (
                        <span className="text-stone-400"> / {seatLimit}</span>
                      )}
                    </div>
                    {seatLimit !== "unlimited" && seatsRemaining === 0 && (
                      <Link
                        href="/pricing"
                        className="mt-1 inline-block text-xs text-emerald-700 dark:text-emerald-400 hover:underline"
                      >
                        Upgrade for more seats →
                      </Link>
                    )}
                  </div>
                </div>
              </section>
            </Reveal>

            {/* Invite form */}
            {canManage && (
              <Reveal>
                <section className="rounded-2xl bg-white dark:bg-stone-900 ring-1 ring-stone-200 dark:ring-stone-800 p-6 mb-6">
                  <h2 className="text-lg font-semibold text-stone-950 dark:text-stone-50 mb-1">
                    Invite a teammate
                  </h2>
                  <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">
                    They’ll receive an email with a link to join {team.name}.
                  </p>
                  <form onSubmit={handleInvite} className="flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[240px]">
                      <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                        Email address
                      </label>
                      <input
                        type="email"
                        required
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="colleague@company.com"
                        className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 px-3 py-2 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="w-44">
                      <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                        Role
                      </label>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as TeamRole)}
                        className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 px-3 py-2 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                        {currentRole === "owner" && <option value="admin">Admin</option>}
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={sending || seatsRemaining === 0}
                      className="rounded-lg bg-stone-900 dark:bg-emerald-600 text-white text-sm font-medium px-4 py-2 hover:bg-stone-800 dark:hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sending ? "Sending…" : "Send invite"}
                    </button>
                  </form>
                  {seatLimit !== "unlimited" && seatsRemaining === 0 && (
                    <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
                      You’ve reached your seat limit. Upgrade your plan to invite more teammates.
                    </p>
                  )}
                  <p className="mt-3 text-xs text-stone-500">
                    {ROLE_DESCRIPTIONS[inviteRole]}
                  </p>
                </section>
              </Reveal>
            )}

            {/* Members list */}
            <Reveal>
              <section className="rounded-2xl bg-white dark:bg-stone-900 ring-1 ring-stone-200 dark:ring-stone-800 overflow-hidden mb-6">
                <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800">
                  <h2 className="text-lg font-semibold text-stone-950 dark:text-stone-50">
                    Members ({members.length})
                  </h2>
                </div>
                <ul className="divide-y divide-stone-200 dark:divide-stone-800">
                  {members.map((m) => (
                    <li key={m.id} className="px-6 py-4 flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-semibold">
                        {(m.name || m.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-stone-950 dark:text-stone-50 truncate">
                          {m.name || m.email}
                          {m.is_current_user && (
                            <span className="ml-2 text-xs text-stone-500">(you)</span>
                          )}
                        </div>
                        <div className="text-xs text-stone-500 truncate">{m.email}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {canManage && !m.is_current_user && m.role !== "owner" ? (
                          <select
                            value={m.role}
                            onChange={(e) =>
                              handleRoleChange(m.user_id, e.target.value as TeamRole)
                            }
                            className="rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 px-2 py-1 text-xs text-stone-900 dark:text-stone-100"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                            {currentRole === "owner" && (
                              <option value="admin">Admin</option>
                            )}
                          </select>
                        ) : (
                          <span className="text-xs font-medium text-stone-700 dark:text-stone-300 px-2 py-1 rounded-md bg-stone-100 dark:bg-stone-800">
                            {ROLE_LABELS[m.role]}
                          </span>
                        )}
                        {canManage && !m.is_current_user && m.role !== "owner" && (
                          <button
                            onClick={() => handleRemove(m.user_id, m.email)}
                            className="text-xs text-rose-600 dark:text-rose-400 hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </Reveal>

            {/* Team activity log */}
            <Reveal>
              <div className="mb-6">
                <ActivityFeed title="Team activity log" limit={30} />
              </div>
            </Reveal>

            {/* Pending invites */}
            {invites.length > 0 && (
              <Reveal>
                <section className="rounded-2xl bg-white dark:bg-stone-900 ring-1 ring-stone-200 dark:ring-stone-800 overflow-hidden">
                  <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800">
                    <h2 className="text-lg font-semibold text-stone-950 dark:text-stone-50">
                      Pending invites ({invites.length})
                    </h2>
                  </div>
                  <ul className="divide-y divide-stone-200 dark:divide-stone-800">
                    {invites.map((inv) => (
                      <li key={inv.id} className="px-6 py-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-stone-500 text-sm">
                          ✉
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-stone-950 dark:text-stone-50 truncate">
                            {inv.email}
                          </div>
                          <div className="text-xs text-stone-500">
                            Invited as {ROLE_LABELS[inv.role]} · expires{" "}
                            {new Date(inv.expires_at).toLocaleDateString()}
                          </div>
                        </div>
                        {canManage && (
                          <button
                            onClick={() => handleRevoke(inv.id, inv.email)}
                            className="text-xs text-rose-600 dark:text-rose-400 hover:underline"
                          >
                            Revoke
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              </Reveal>
            )}
          </>
        )}
      </div>
    </main>
  );
}

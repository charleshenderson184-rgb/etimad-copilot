"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { useAuth } from "@/lib/auth";
import { acceptTeamInvite, TeamResponse } from "@/lib/api";

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const { user, loading: authLoading } = useAuth();

  const [status, setStatus] = useState<"idle" | "accepting" | "ok" | "error">("idle");
  const [team, setTeam] = useState<TeamResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setStatus("accepting");
    setError(null);
    try {
      const t = await acceptTeamInvite(token);
      setTeam(t);
      setStatus("ok");
      setTimeout(() => router.push("/team"), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to accept invite");
      setStatus("error");
    }
  };

  // Auto-redirect to signin if not authenticated, with return URL
  useEffect(() => {
    if (!authLoading && !user) {
      sessionStorage.setItem("etimad_post_signin", `/invite/${token}`);
      router.replace("/signin");
    }
  }, [authLoading, user, router, token]);

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
      <div className="max-w-md mx-auto px-6 py-16">
        <div className="rounded-2xl bg-white dark:bg-stone-900 ring-1 ring-stone-200 dark:ring-stone-800 p-8 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-3xl">
            ✉
          </div>
          <h1 className="mt-6 text-2xl font-bold text-stone-950 dark:text-stone-50">
            You’ve been invited
          </h1>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
            Accept this invitation to join the team and start collaborating on tenders.
          </p>

          {status === "idle" && (
            <button
              onClick={handleAccept}
              className="mt-6 w-full rounded-lg bg-stone-900 dark:bg-emerald-600 text-white font-medium py-2.5 hover:bg-stone-800 dark:hover:bg-emerald-500"
            >
              Accept invitation
            </button>
          )}

          {status === "accepting" && (
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-stone-600">
              <div className="animate-spin h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full" />
              Joining team…
            </div>
          )}

          {status === "ok" && team && (
            <div className="mt-6">
              <div className="text-emerald-600 dark:text-emerald-400 font-medium">
                ✓ Welcome to {team.name}
              </div>
              <p className="mt-2 text-xs text-stone-500">Redirecting…</p>
            </div>
          )}

          {status === "error" && (
            <div className="mt-6">
              <div className="rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-4 py-3 text-sm text-rose-900 dark:text-rose-200">
                {error}
              </div>
              <Link
                href="/dashboard"
                className="mt-4 inline-block text-sm text-stone-600 dark:text-stone-400 hover:underline"
              >
                Back to dashboard
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

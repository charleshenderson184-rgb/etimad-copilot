"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { Reveal } from "@/components/reveal";
import { AnimatedCounter } from "@/components/animated-counter";
import { PLANS, useAuth } from "@/lib/auth";

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="animate-spin h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full" /></div>}>
      <AccountPageContent />
    </Suspense>
  );
}

function AccountPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/signin");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main className="flex-1 flex items-center justify-center bg-stone-50">
        <div className="animate-spin h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </main>
    );
  }

  const plan = PLANS[user.plan];
  const justUpgraded = searchParams.get("upgraded") === "1";

  const rfpLimit =
    plan.limits.rfps_per_month === "unlimited"
      ? Infinity
      : plan.limits.rfps_per_month;
  const proposalLimit =
    plan.limits.proposals_per_month === "unlimited"
      ? Infinity
      : plan.limits.proposals_per_month;
  const docLimit =
    plan.limits.knowledge_base_docs === "unlimited"
      ? Infinity
      : plan.limits.knowledge_base_docs;

  return (
    <main className="flex-1 bg-mesh min-h-screen">
      <SiteNav />

      {justUpgraded && (
        <div className="relative bg-emerald-50 border-b border-emerald-200/60">
          <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-3 text-sm text-emerald-900">
            <span className="text-emerald-600 text-lg">✓</span>
            <span>
              Plan updated to <strong>{plan.label}</strong>. Welcome to the
              winner&apos;s circle.
            </span>
          </div>
        </div>
      )}

      <section className="px-6 pt-10 pb-6">
        <div className="max-w-5xl mx-auto flex items-start gap-4 flex-wrap justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-700 to-emerald-900 flex items-center justify-center text-white text-xl font-bold shadow-md">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-stone-900">{user.name}</h1>
              <p className="text-sm text-stone-500">{user.email}</p>
              {user.company && (
                <p className="text-xs text-stone-400 mt-0.5">{user.company}</p>
              )}
            </div>
          </div>

          <button
            onClick={() => {
              signOut();
              router.push("/");
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors"
          >
            Sign out
          </button>
        </div>
      </section>

      <section className="px-6 pb-10">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Current plan card */}
          <Reveal>
            <div className="lg:col-span-1 bg-gradient-to-br from-emerald-800 via-emerald-900 to-stone-900 rounded-3xl p-7 text-white relative overflow-hidden shadow-xl h-full">
              <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full border border-emerald-700/40 animate-rotate-slow" />
              <div className="relative">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300 mb-2">
                  Current Plan
                </p>
                <h2 className="text-3xl font-bold tracking-tight">
                  {plan.label}
                </h2>
                <p className="text-sm text-emerald-100/70 mt-1" dir="rtl">
                  {plan.labelAr}
                </p>

                {plan.priceSar !== null && plan.priceSar > 0 && (
                  <div className="mt-5 flex items-baseline gap-1.5">
                    <span className="text-xs font-semibold text-emerald-300">
                      SAR
                    </span>
                    <span className="text-4xl font-bold">
                      {plan.priceSar.toLocaleString()}
                    </span>
                    <span className="text-sm text-emerald-200/70">/ mo</span>
                  </div>
                )}

                <p className="text-sm text-emerald-100/80 mt-4 leading-relaxed">
                  {plan.description}
                </p>

                <div className="mt-6 flex gap-2">
                  <Link
                    href="/pricing"
                    className="flex-1 text-center px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 ring-1 ring-white/20 text-xs font-medium transition-colors"
                  >
                    {user.plan === "enterprise" ? "Compare plans" : "Upgrade"}
                  </Link>
                  {user.plan !== "trial" && (
                    <button
                      onClick={async () => {
                        const { createBillingPortalSession } = await import("@/lib/api");
                        try {
                          const { url } = await createBillingPortalSession();
                          window.location.href = url;
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className="flex-1 text-center px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 ring-1 ring-white/10 text-xs font-medium transition-colors"
                    >
                      Manage billing
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Reveal>

          {/* Usage stats */}
          <Reveal delay={100}>
            <div className="lg:col-span-2 bg-white rounded-3xl ring-1 ring-stone-200 p-7 h-full">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-stone-900">
                    Usage this month
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Resets on the 1st of each month
                  </p>
                </div>
                <div className="text-xs text-stone-400 font-mono">
                  {new Date().toLocaleString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </div>
              </div>

              <div className="space-y-5">
                <UsageBar
                  label="RFPs Analyzed"
                  labelAr="منافسات محللة"
                  used={user.usage.rfps_analyzed}
                  limit={rfpLimit}
                  color="emerald"
                />
                <UsageBar
                  label="Proposal Credits"
                  labelAr="رصيد العروض"
                  used={user.usage.proposal_credits_spent ?? 0}
                  limit={proposalLimit}
                  color="blue"
                  hint="bilingual costs 2 credits"
                />
                <UsageBar
                  label="Knowledge Base Documents"
                  labelAr="مستندات قاعدة المعرفة"
                  used={user.usage.documents_uploaded}
                  limit={docLimit}
                  color="amber"
                />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Activity summary */}
      <section className="px-6 pb-10">
        <Reveal>
          <div className="max-w-5xl mx-auto bg-white rounded-3xl ring-1 ring-stone-200 p-7">
            <h2 className="text-lg font-semibold text-stone-900 mb-1">
              Lifetime activity
            </h2>
            <p className="text-xs text-stone-500 mb-6">
              Since {new Date(user.joinedAt).toLocaleDateString()}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
              <ActivityStat
                label="Tenders analyzed"
                value={user.usage.rfps_analyzed}
              />
              <ActivityStat
                label="Proposals drafted"
                value={user.usage.proposals_generated}
              />
              <ActivityStat
                label="Documents indexed"
                value={user.usage.documents_uploaded}
              />
              <ActivityStat
                label="Days as member"
                value={Math.max(
                  1,
                  Math.floor(
                    (Date.now() - new Date(user.joinedAt).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                )}
              />
            </div>
          </div>
        </Reveal>
      </section>

      {/* Quick links */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
          <QuickLink
            href="/profile"
            title="Company Profile"
            subtitle="Update your details and knowledge base"
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.6}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            }
          />
          <QuickLink
            href="/"
            title="Analyze a Tender"
            subtitle="Upload an RFP for instant analysis"
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.6}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            }
          />
          <QuickLink
            href="/pricing"
            title="Compare Plans"
            subtitle="Upgrade or change your subscription"
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.6}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
              />
            }
          />
        </div>
      </section>
    </main>
  );
}

function UsageBar({
  label,
  labelAr,
  used,
  limit,
  color,
  hint,
}: {
  label: string;
  labelAr: string;
  used: number;
  limit: number;
  color: "emerald" | "blue" | "amber";
  hint?: string;
}) {
  const isUnlimited = limit === Infinity;
  const pct = isUnlimited ? 0 : Math.min(100, (used / limit) * 100);

  const colorMap = {
    emerald: {
      bar: "bg-emerald-600",
      track: "bg-emerald-50",
      text: "text-emerald-700",
    },
    blue: {
      bar: "bg-blue-600",
      track: "bg-blue-50",
      text: "text-blue-700",
    },
    amber: {
      bar: "bg-amber-600",
      track: "bg-amber-50",
      text: "text-amber-700",
    },
  }[color];

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <div>
          <span className="text-sm font-medium text-stone-900">{label}</span>
          <span className="text-xs text-stone-400 ml-2" dir="rtl">
            {labelAr}
          </span>
        </div>
        <div className="text-sm tabular-nums">
          <span className={`font-bold ${colorMap.text}`}>{used}</span>
          <span className="text-stone-400">
            {" / "}
            {isUnlimited ? "∞" : limit}
          </span>
        </div>
      </div>
      <div className={`h-2 rounded-full ${colorMap.track} overflow-hidden`}>
        <div
          className={`h-full ${colorMap.bar} transition-all duration-700 ease-out rounded-full`}
          style={{ width: isUnlimited ? "8%" : `${pct}%` }}
        />
      </div>
      {hint && (
        <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-1">{hint}</p>
      )}
      {!isUnlimited && pct >= 80 && (
        <p className="text-xs text-amber-600 mt-1.5">
          {Math.round(100 - pct)}% remaining this month
        </p>
      )}
    </div>
  );
}

function ActivityStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-3xl font-bold text-gradient">
        <AnimatedCounter value={value} />
      </div>
      <div className="text-xs text-stone-500 mt-1">{label}</div>
    </div>
  );
}

function QuickLink({
  href,
  title,
  subtitle,
  icon,
}: {
  href: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group block bg-white rounded-2xl ring-1 ring-stone-200/80 hover:ring-emerald-300 hover:shadow-md transition-all p-5"
    >
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 ring-1 ring-emerald-100 mb-3 group-hover:bg-emerald-100 transition-colors">
        <svg
          className="w-5 h-5 text-emerald-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {icon}
        </svg>
      </div>
      <h3 className="font-semibold text-stone-900 mb-0.5">{title}</h3>
      <p className="text-sm text-stone-500 leading-relaxed">{subtitle}</p>
      <div className="mt-3 text-xs text-emerald-700 font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
        Go
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

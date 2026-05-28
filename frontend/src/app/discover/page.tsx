"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteNav } from "@/components/site-nav";
import { Reveal } from "@/components/reveal";
import { AddTenderModal } from "@/components/add-tender-modal";
import {
  DiscoveredTenderResponse,
  dismissDiscovered,
  listDiscovered,
  saveDiscoveredAsRFP,
} from "@/lib/api";
import { useToast } from "@/lib/toast";
import { DiscoverCardSkeleton } from "@/components/skeleton";

type SortKey = "match" | "deadline" | "value" | "newest";

export default function DiscoverPage() {
  const router = useRouter();
  const { show } = useToast();
  const [tenders, setTenders] = useState<DiscoveredTenderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [minScore, setMinScore] = useState(0);
  const [sort, setSort] = useState<SortKey>("match");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    listDiscovered({ minScore: 0, limit: 100 })
      .then(setTenders)
      .finally(() => setLoading(false));
  }, []);

  const sortedFiltered = useMemo(() => {
    const filtered = tenders.filter((t) => t.match_score >= minScore);
    const sorted = [...filtered];
    if (sort === "match") {
      sorted.sort(
        (a, b) =>
          b.match_score - a.match_score ||
          (a.days_until_deadline ?? 9999) - (b.days_until_deadline ?? 9999)
      );
    } else if (sort === "deadline") {
      sorted.sort(
        (a, b) =>
          (a.days_until_deadline ?? 9999) - (b.days_until_deadline ?? 9999)
      );
    } else if (sort === "value") {
      sorted.sort(
        (a, b) => (b.estimated_value_sar ?? 0) - (a.estimated_value_sar ?? 0)
      );
    } else {
      sorted.sort(
        (a, b) =>
          new Date(b.discovered_at).getTime() -
          new Date(a.discovered_at).getTime()
      );
    }
    return sorted;
  }, [tenders, minScore, sort]);

  const stats = useMemo(() => {
    const highMatch = tenders.filter((t) => t.match_score >= 70).length;
    const totalValue = tenders.reduce(
      (s, t) => s + (t.estimated_value_sar ?? 0),
      0
    );
    const closingSoon = tenders.filter(
      (t) =>
        t.days_until_deadline !== null &&
        t.days_until_deadline >= 0 &&
        t.days_until_deadline <= 7
    ).length;
    return { highMatch, totalValue, closingSoon };
  }, [tenders]);

  const handleSave = async (t: DiscoveredTenderResponse) => {
    setSavingId(t.id);
    try {
      const rfp = await saveDiscoveredAsRFP(t.id);
      setTenders((prev) => prev.filter((x) => x.id !== t.id));
      show({
        variant: "success",
        title: "Added to pipeline",
        message: `"${t.title.slice(0, 50)}${t.title.length > 50 ? "…" : ""}" is now in your dashboard.`,
      });
      setTimeout(() => router.push(`/rfp/${rfp.id}`), 800);
    } catch (err) {
      show({
        variant: "error",
        message: err instanceof Error ? err.message : "Failed to save",
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleDismiss = async (t: DiscoveredTenderResponse) => {
    setDismissingId(t.id);
    try {
      await dismissDiscovered(t.id);
      setTenders((prev) => prev.filter((x) => x.id !== t.id));
      show({
        variant: "info",
        message: "Hidden from your feed",
      });
    } catch (err) {
      show({
        variant: "error",
        message: err instanceof Error ? err.message : "Failed to dismiss",
      });
    } finally {
      setDismissingId(null);
    }
  };

  return (
    <main className="flex-1 bg-mesh dark:bg-stone-950 min-h-screen">
      <SiteNav />

      {/* Header */}
      <section className="px-6 pt-10 pb-6">
        <div className="max-w-7xl mx-auto flex items-start justify-between gap-4 flex-wrap" data-tour="discover-feed">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-2">
              Tender Discovery
            </p>
            <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
              Opportunities matched to you
            </h1>
            <p className="text-stone-600 dark:text-stone-400 mt-1">
              {tenders.length} active tenders from Etimad · refreshed{" "}
              {tenders.length > 0
                ? new Date(
                    Math.max(
                      ...tenders.map((t) =>
                        new Date(t.discovered_at).getTime()
                      )
                    )
                  ).toLocaleString()
                : "just now"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-white dark:bg-stone-900 ring-1 ring-stone-200 dark:ring-stone-800 shadow-sm">
              {(
                [
                  { v: "match", label: "Best match" },
                  { v: "deadline", label: "Closing soon" },
                  { v: "value", label: "Highest value" },
                  { v: "newest", label: "Newest" },
                ] as { v: SortKey; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setSort(opt.v)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    sort === opt.v
                      ? "bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 shadow-sm"
                      : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-br from-emerald-700 to-emerald-900 text-white text-sm font-semibold hover:shadow-md transition-all shadow-sm"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add tender
            </button>
          </div>
        </div>
      </section>

      <AddTenderModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={(t) => setTenders((prev) => [t, ...prev])}
      />

      {/* Stats */}
      <section className="px-6 pb-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatPill
            label="Strong matches"
            sub="≥ 70 score"
            value={stats.highMatch}
            color="text-emerald-700 dark:text-emerald-300"
          />
          <StatPill
            label="Closing this week"
            sub="≤ 7 days"
            value={stats.closingSoon}
            color="text-red-700 dark:text-red-300"
          />
          <StatPill
            label="Total pipeline"
            sub="all listings"
            value={tenders.length}
            color="text-stone-900 dark:text-stone-100"
          />
          <StatPill
            label="Total value"
            sub="SAR"
            value={`${(stats.totalValue / 1_000_000_000).toFixed(2)}B`}
            color="text-blue-700 dark:text-blue-300"
            isString
          />
        </div>
      </section>

      {/* Filter bar */}
      <section className="px-6 pb-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-stone-500 dark:text-stone-400 font-medium">
              Min match score:
            </span>
            {([0, 50, 70, 85] as const).map((s) => (
              <button
                key={s}
                onClick={() => setMinScore(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  minScore === s
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "bg-white dark:bg-stone-900 ring-1 ring-stone-200 dark:ring-stone-800 text-stone-600 dark:text-stone-400 hover:ring-emerald-300"
                }`}
              >
                {s === 0 ? "All" : `${s}+`}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Feed */}
      <section className="px-6 pb-20">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="space-y-2.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <DiscoverCardSkeleton key={i} />
              ))}
            </div>
          ) : sortedFiltered.length === 0 ? (
            <div className="bg-white dark:bg-stone-900 rounded-2xl ring-1 ring-stone-200 dark:ring-stone-800 p-12 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 mb-4">
                <svg
                  className="w-6 h-6 text-emerald-700 dark:text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-1">
                No matches at this filter
              </h3>
              <p className="text-sm text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
                Lower the minimum match score or improve your profile to see
                more opportunities.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {sortedFiltered.map((t, idx) => (
                <Reveal key={t.id} delay={Math.min(idx * 50, 400)}>
                  <div data-tour={idx === 0 ? "tender-card" : undefined}>
                    <TenderListing
                      tender={t}
                      expanded={expandedId === t.id}
                      onToggle={() =>
                        setExpandedId(expandedId === t.id ? null : t.id)
                      }
                      onSave={() => handleSave(t)}
                      onDismiss={() => handleDismiss(t)}
                      saving={savingId === t.id}
                      dismissing={dismissingId === t.id}
                    />
                  </div>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function StatPill({
  label,
  sub,
  value,
  color,
  isString,
}: {
  label: string;
  sub: string;
  value: number | string;
  color: string;
  isString?: boolean;
}) {
  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl ring-1 ring-stone-200 dark:ring-stone-800 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
        {label}
      </p>
      <p className={`text-2xl font-bold tracking-tight tabular-nums ${color}`}>
        {isString ? value : value}
      </p>
      <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5">
        {sub}
      </p>
    </div>
  );
}

function TenderListing({
  tender,
  expanded,
  onToggle,
  onSave,
  onDismiss,
  saving,
  dismissing,
}: {
  tender: DiscoveredTenderResponse;
  expanded: boolean;
  onToggle: () => void;
  onSave: () => void;
  onDismiss: () => void;
  saving: boolean;
  dismissing: boolean;
}) {
  const score = tender.match_score;
  const scoreColor =
    score >= 70
      ? "from-emerald-600 to-emerald-700"
      : score >= 50
      ? "from-amber-500 to-amber-600"
      : "from-stone-400 to-stone-500";
  const scoreBadge =
    score >= 70
      ? "bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-800/60"
      : score >= 50
      ? "bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-800/60"
      : "bg-stone-100 text-stone-700 ring-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:ring-stone-700";

  const days = tender.days_until_deadline;
  const deadlineColor =
    days === null
      ? "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
      : days < 0
      ? "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
      : days <= 7
      ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
      : days <= 21
      ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
      : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";

  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl ring-1 ring-stone-200 dark:ring-stone-800 hover:ring-emerald-300 dark:hover:ring-emerald-700 hover:shadow-md transition-all overflow-hidden">
      <div className="p-5 flex items-start gap-5">
        {/* Match score circle */}
        <div className="flex-shrink-0">
          <div className="relative w-16 h-16">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="currentColor"
                className="text-stone-100 dark:text-stone-800"
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="url(#scoreGrad)"
                strokeWidth="3"
                strokeDasharray={`${score} 100`}
                strokeLinecap="round"
                pathLength="100"
                style={{
                  transition: "stroke-dasharray 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              />
              <defs>
                <linearGradient id="scoreGrad" x1="0" x2="1" y1="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={
                      score >= 70
                        ? "#10b981"
                        : score >= 50
                        ? "#f59e0b"
                        : "#a8a29e"
                    }
                  />
                  <stop
                    offset="100%"
                    stopColor={
                      score >= 70
                        ? "#047857"
                        : score >= 50
                        ? "#d97706"
                        : "#78716c"
                    }
                  />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-sm font-bold text-stone-900 dark:text-stone-100 leading-none">
                {score}
              </div>
              <div className="text-[8px] uppercase tracking-wider text-stone-400 dark:text-stone-500 leading-none mt-0.5">
                match
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <button
          onClick={onToggle}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-start gap-2 flex-wrap mb-1.5">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ring-1 ${scoreBadge}`}
            >
              {score >= 70
                ? "Strong fit"
                : score >= 50
                ? "Possible fit"
                : "Weak fit"}
            </span>
            {days !== null && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${deadlineColor}`}
              >
                <svg
                  className="w-2.5 h-2.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {days < 0
                  ? "Past deadline"
                  : days === 0
                  ? "Today"
                  : `${days} days left`}
              </span>
            )}
            <span className="text-[10px] text-stone-400 dark:text-stone-500 font-mono">
              {tender.external_id}
            </span>
          </div>

          <h3 className="font-semibold text-stone-900 dark:text-stone-100 leading-snug">
            {tender.title}
          </h3>
          {tender.title_ar && (
            <p
              className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-snug"
              dir="rtl"
            >
              {tender.title_ar}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-stone-500 dark:text-stone-400 flex-wrap">
            <span className="inline-flex items-center gap-1">
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.6}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              {tender.buyer}
            </span>
            {tender.estimated_value_sar && (
              <span>
                SAR {(tender.estimated_value_sar / 1_000_000).toFixed(1)}M
              </span>
            )}
            {tender.industry && (
              <span className="text-stone-400 dark:text-stone-500">
                · {tender.industry.split(",")[0]}
              </span>
            )}
          </div>
        </button>

        {/* Actions */}
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-br from-emerald-700 to-emerald-900 text-white text-xs font-semibold hover:shadow-md disabled:opacity-50 transition-all whitespace-nowrap"
          >
            {saving ? (
              <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
            Pursue
          </button>
          <button
            onClick={onDismiss}
            disabled={dismissing}
            className="text-xs text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 disabled:opacity-50 transition-colors px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-5 pl-[88px] border-t border-stone-100 dark:border-stone-800 animate-fade-in-down">
          {tender.description && (
            <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed mt-4 mb-4">
              {tender.description}
            </p>
          )}

          {tender.match_reasons.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
                Why this matches
              </p>
              <div className="space-y-2">
                {tender.match_reasons.map((reason, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 text-xs"
                  >
                    <div
                      className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                        reason.score > 0
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
                      }`}
                    >
                      {reason.score > 0 ? (
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        <span className="text-[10px] font-bold">!</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-stone-900 dark:text-stone-100">
                        {reason.label}
                        {reason.score > 0 && (
                          <span className="text-stone-400 dark:text-stone-500 ml-2 font-normal">
                            +{reason.score}
                          </span>
                        )}
                      </p>
                      {reason.detail && (
                        <p className="text-stone-500 dark:text-stone-400 mt-0.5">
                          {reason.detail}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
            {tender.lcgpa_min_score !== null && (
              <span>LCGPA ≥ {tender.lcgpa_min_score}%</span>
            )}
            {tender.saudization_min !== null && (
              <span>Saudization ≥ {tender.saudization_min}%</span>
            )}
            {tender.source_url && (
              <a
                href={tender.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
              >
                View on Etimad
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

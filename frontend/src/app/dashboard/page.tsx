"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { DeadlineCalendar } from "@/components/deadline-calendar";
import { PdfUpload } from "@/components/pdf-upload";
import { AnimatedCounter } from "@/components/animated-counter";
import { SpotlightCard } from "@/components/spotlight-card";
import {
  DiscoveredTenderResponse,
  listDiscovered,
  listRFPs,
  RFPResponse,
  updateRFP,
  deleteRFP,
} from "@/lib/api";
import { useToast } from "@/lib/toast";
import { useConfetti } from "@/components/confetti";
import { TenderCardSkeleton, StatTileSkeleton } from "@/components/skeleton";
import { KanbanBoard } from "@/components/kanban-board";
import { ActivityFeed } from "@/components/activity-feed";
import {
  OnboardingWizard,
  shouldShowOnboarding,
} from "@/components/onboarding-wizard";

type TenderStatus = RFPResponse["tender_status"];

const TENDER_STATUS_LABELS: Record<
  TenderStatus,
  { label: string; color: string; ring: string }
> = {
  draft: {
    label: "Draft",
    color: "text-stone-600 dark:text-stone-300",
    ring: "ring-stone-200 dark:ring-stone-700",
  },
  in_progress: {
    label: "In Progress",
    color: "text-blue-700 dark:text-blue-300",
    ring: "ring-blue-200 dark:ring-blue-800",
  },
  submitted: {
    label: "Submitted",
    color: "text-amber-700 dark:text-amber-300",
    ring: "ring-amber-200 dark:ring-amber-800",
  },
  won: {
    label: "Won",
    color: "text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-200 dark:ring-emerald-800",
  },
  lost: {
    label: "Lost",
    color: "text-red-700 dark:text-red-300",
    ring: "ring-red-200 dark:ring-red-800",
  },
};

export default function DashboardPage() {
  const { show } = useToast();
  const { fire: fireConfetti } = useConfetti();
  const [rfps, setRfps] = useState<RFPResponse[]>([]);
  const [topMatches, setTopMatches] = useState<DiscoveredTenderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | TenderStatus>("all");
  const [showUpload, setShowUpload] = useState(false);
  const [view, setView] = useState<"list" | "board">("list");
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    Promise.all([listRFPs(), listDiscovered({ minScore: 70, limit: 3 })])
      .then(([rfpsData, matchesData]) => {
        setRfps(rfpsData);
        setTopMatches(matchesData);
        // First-time user with no tenders — show onboarding
        if (rfpsData.length === 0 && shouldShowOnboarding()) {
          setShowOnboarding(true);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return rfps;
    return rfps.filter((r) => r.tender_status === filter);
  }, [rfps, filter]);

  const stats = useMemo(() => {
    const won = rfps.filter((r) => r.tender_status === "won");
    const submitted = rfps.filter((r) => r.tender_status === "submitted");
    const inProgress = rfps.filter((r) => r.tender_status === "in_progress");
    const totalWonValue = won.reduce(
      (s, r) => s + (r.estimated_value_sar ?? 0),
      0
    );
    return {
      total: rfps.length,
      won: won.length,
      submitted: submitted.length,
      inProgress: inProgress.length,
      totalWonValue,
    };
  }, [rfps]);

  const calendarItems = useMemo(() => {
    return rfps
      .filter((r) => r.submission_deadline)
      .map((r) => ({
        id: r.id,
        title: r.title || r.filename,
        deadline: new Date(r.submission_deadline!),
        href: `/rfp/${r.id}`,
        tender_status: r.tender_status,
      }));
  }, [rfps]);

  const handleStatusChange = async (
    rfp: RFPResponse,
    newStatus: TenderStatus
  ) => {
    try {
      const updated = await updateRFP(rfp.id, { tender_status: newStatus });
      setRfps((prev) => prev.map((r) => (r.id === rfp.id ? updated : r)));
      if (newStatus === "won") {
        // Fire confetti from the center-top of the viewport
        fireConfetti({ count: 160, y: window.innerHeight / 4 });
      }
      show({
        variant: newStatus === "won" ? "success" : "info",
        title:
          newStatus === "won"
            ? "🎉 Congratulations — you won!"
            : "Status updated",
        message:
          newStatus === "won"
            ? `"${rfp.title || rfp.filename}" added SAR ${((rfp.estimated_value_sar || 0) / 1_000_000).toFixed(1)}M to your won pile.`
            : `"${rfp.title || rfp.filename}" → ${TENDER_STATUS_LABELS[newStatus].label}`,
        duration: newStatus === "won" ? 6000 : 4000,
      });
    } catch (err) {
      show({
        variant: "error",
        message: err instanceof Error ? err.message : "Update failed",
      });
    }
  };

  const handleDelete = async (rfp: RFPResponse) => {
    if (!confirm(`Delete "${rfp.title || rfp.filename}"? This cannot be undone.`)) return;
    try {
      await deleteRFP(rfp.id);
      setRfps((prev) => prev.filter((r) => r.id !== rfp.id));
      show({
        variant: "success",
        message: "Tender deleted",
      });
    } catch (err) {
      show({
        variant: "error",
        message: err instanceof Error ? err.message : "Delete failed",
      });
    }
  };

  return (
    <main className="flex-1 bg-mesh dark:bg-stone-950 min-h-screen">
      <SiteNav />

      <OnboardingWizard
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />

      {/* Header */}
      <section className="px-6 pt-10 pb-6">
        <div className="max-w-7xl mx-auto flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-2">
              Tender Pipeline
            </p>
            <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
              Your Active Tenders
            </h1>
            <p className="text-stone-600 dark:text-stone-400 mt-1">
              Manage every RFP from upload to award.
            </p>
          </div>

          <button
            onClick={() => setShowUpload((s) => !s)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-900 text-white text-sm font-semibold hover:shadow-lg transition-all shadow-md"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            {showUpload ? "Hide uploader" : "New Tender"}
          </button>
        </div>
      </section>

      {showUpload && (
        <section className="px-6 pb-6 animate-fade-in-down">
          <div className="max-w-7xl mx-auto">
            <PdfUpload />
          </div>
        </section>
      )}

      {/* Bento stats */}
      <section className="px-6 pb-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4" data-tour="pipeline-stats">
          {/* Won — large featured tile */}
          <div className="col-span-2 md:col-span-2 relative bg-gradient-to-br from-emerald-700 via-emerald-800 to-stone-900 text-white rounded-3xl p-6 shadow-elev-3 noise overflow-hidden card-lift">
            <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full border border-emerald-500/30 animate-spin-slow" />
            <div className="absolute -bottom-12 -left-12 w-44 h-44 rounded-full border border-emerald-600/20 animate-spin-slow" style={{ animationDirection: "reverse" }} />
            <div className="relative">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300 mb-3">
                Won this period
              </p>
              <div className="flex items-baseline gap-3">
                <span className="text-6xl font-bold tracking-tight tabular-nums">
                  {stats.won}
                </span>
                {stats.totalWonValue > 0 && (
                  <span className="text-emerald-200/80 text-sm">
                    SAR {(stats.totalWonValue / 1000000).toFixed(1)}M total
                  </span>
                )}
              </div>
              <p className="text-emerald-100/70 text-sm mt-2">
                {stats.won === 0
                  ? "No wins yet — focus on the strong-fit tenders in your feed."
                  : "Mark a tender as won when you receive an award notification."}
              </p>
            </div>
          </div>

          <SpotlightCard className="bg-white dark:bg-stone-900 rounded-3xl ring-1 ring-stone-200 dark:ring-stone-800 p-6 shadow-elev-1 card-lift">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400 mb-2">
              In progress
            </p>
            <div className="text-4xl font-bold text-blue-700 dark:text-blue-300 tabular-nums">
              <AnimatedCounter value={stats.inProgress} />
            </div>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-2">active bids</p>
          </SpotlightCard>

          <SpotlightCard className="bg-white dark:bg-stone-900 rounded-3xl ring-1 ring-stone-200 dark:ring-stone-800 p-6 shadow-elev-1 card-lift">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400 mb-2">
              Submitted
            </p>
            <div className="text-4xl font-bold text-amber-700 dark:text-amber-300 tabular-nums">
              <AnimatedCounter value={stats.submitted} />
            </div>
            <p className="text-xs text-stone-400 dark:text-stone-500 mt-2">awaiting result</p>
          </SpotlightCard>

          <div className="col-span-2 md:col-span-4 flex items-center gap-3 p-4 rounded-2xl bg-white/60 dark:bg-stone-900/60 ring-1 ring-stone-200/60 dark:ring-stone-800/60">
            <div className="w-9 h-9 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
              <svg className="w-4 h-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                {stats.total} total tenders managed
              </p>
              <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5">
                Across all statuses, all time
              </p>
            </div>
            <Link href="/analytics" className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap">
              View analytics →
            </Link>
          </div>
        </div>
      </section>

      {/* Main grid */}
      <section className="px-6 pb-20">
        <div className={`max-w-7xl mx-auto grid grid-cols-1 gap-6 ${view === "board" ? "" : "lg:grid-cols-[1fr_320px]"}`}>
          {/* Tender list */}
          <div>
            {/* Filter tabs + view toggle */}
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-1 flex-wrap">
                {view === "list" && (
                  <>
                    <FilterChip
                      active={filter === "all"}
                      onClick={() => setFilter("all")}
                      label="All"
                      count={rfps.length}
                    />
                    {(["draft", "in_progress", "submitted", "won", "lost"] as TenderStatus[]).map(
                      (s) => {
                        const count = rfps.filter((r) => r.tender_status === s).length;
                        return (
                          <FilterChip
                            key={s}
                            active={filter === s}
                            onClick={() => setFilter(s)}
                            label={TENDER_STATUS_LABELS[s].label}
                            count={count}
                          />
                        );
                      }
                    )}
                  </>
                )}
                {view === "board" && (
                  <p className="text-xs text-stone-500 dark:text-stone-400 px-2 py-1.5">
                    Drag cards between columns to update status. Drop on{" "}
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">Won</span> for confetti 🎉
                  </p>
                )}
              </div>
              <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 ring-1 ring-stone-200 dark:ring-stone-700">
                <button
                  onClick={() => setView("list")}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    view === "list"
                      ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm"
                      : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  List
                </button>
                <button
                  onClick={() => setView("board")}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    view === "board"
                      ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm"
                      : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v9a1 1 0 01-1 1h-4a1 1 0 01-1-1V5z" />
                  </svg>
                  Board
                </button>
              </div>
            </div>

            {loading ? (
              <div className="space-y-2.5">
                {[0, 1, 2, 3].map((i) => (
                  <TenderCardSkeleton key={i} />
                ))}
              </div>
            ) : view === "board" ? (
              rfps.length === 0 ? (
                <EmptyState
                  hasAny={false}
                  onUpload={() => setShowUpload(true)}
                />
              ) : (
                <KanbanBoard
                  rfps={rfps}
                  onChange={(updated) =>
                    setRfps((prev) =>
                      prev.map((r) => (r.id === updated.id ? updated : r))
                    )
                  }
                />
              )
            ) : filtered.length === 0 ? (
              <EmptyState
                hasAny={rfps.length > 0}
                onUpload={() => setShowUpload(true)}
              />
            ) : (
              <div className="space-y-2.5">
                {filtered.map((rfp) => (
                  <TenderCard
                    key={rfp.id}
                    rfp={rfp}
                    onStatusChange={(s) => handleStatusChange(rfp, s)}
                    onDelete={() => handleDelete(rfp)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          {view === "board" ? null : (
          <aside className="space-y-5">
            {topMatches.length > 0 && (
              <div className="bg-white dark:bg-stone-900 rounded-2xl ring-1 ring-stone-200 dark:ring-stone-800 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-0.5">
                      Top Matches Today
                    </p>
                    <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                      Discovered for you
                    </h3>
                  </div>
                  <Link
                    href="/discover"
                    className="text-xs text-emerald-700 dark:text-emerald-400 font-medium hover:underline whitespace-nowrap"
                  >
                    View all
                  </Link>
                </div>
                <div className="space-y-3">
                  {topMatches.map((t) => (
                    <Link
                      key={t.id}
                      href="/discover"
                      className="block p-3 rounded-xl ring-1 ring-stone-100 dark:ring-stone-800 hover:ring-emerald-300 dark:hover:ring-emerald-700 hover:shadow-sm transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${
                            t.match_score >= 85
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                          }`}
                        >
                          {t.match_score}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                            {t.title}
                          </p>
                          <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                            {t.buyer}
                            {t.days_until_deadline !== null &&
                              ` · ${t.days_until_deadline}d left`}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <DeadlineCalendar items={calendarItems} />
            <ActivityFeed title="Team activity" limit={12} />
          </aside>
          )}
        </div>
      </section>
    </main>
  );
}

function StatTile({
  label,
  value,
  hint,
  color = "text-stone-900 dark:text-stone-100",
}: {
  label: string;
  value: number;
  hint: string;
  color?: string;
}) {
  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl ring-1 ring-stone-200 dark:ring-stone-800 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
        {label}
      </p>
      <p className={`text-3xl font-bold ${color} tracking-tight`}>{value}</p>
      <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">{hint}</p>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        active
          ? "bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 shadow-sm"
          : "bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 ring-1 ring-stone-200 dark:ring-stone-800 hover:ring-stone-300"
      }`}
    >
      {label}
      <span
        className={`px-1.5 py-0.5 rounded text-[10px] ${
          active
            ? "bg-white/20 dark:bg-stone-900/20"
            : "bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function TenderCard({
  rfp,
  onStatusChange,
  onDelete,
}: {
  rfp: RFPResponse;
  onStatusChange: (s: TenderStatus) => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const status = TENDER_STATUS_LABELS[rfp.tender_status];

  const deadline = rfp.submission_deadline
    ? new Date(rfp.submission_deadline)
    : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = deadline
    ? Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl ring-1 ring-stone-200 dark:ring-stone-800 p-5 hover:ring-emerald-300 dark:hover:ring-emerald-700 hover:shadow-md transition-all">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
          <svg
            className="w-5 h-5 text-stone-500 dark:text-stone-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.6}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>

        <Link href={`/rfp/${rfp.id}`} className="flex-1 min-w-0 group">
          <h3 className="font-semibold text-stone-900 dark:text-stone-100 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
            {rfp.title || rfp.filename}
          </h3>
          {rfp.title_ar && (
            <p
              className="text-xs text-stone-400 dark:text-stone-500 mt-0.5 truncate"
              dir="rtl"
            >
              {rfp.title_ar}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-stone-500 dark:text-stone-400 flex-wrap">
            {rfp.buyer && (
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
                {rfp.buyer}
              </span>
            )}
            {rfp.estimated_value_sar && (
              <span>
                SAR {(rfp.estimated_value_sar / 1000000).toFixed(1)}M
              </span>
            )}
            <span>{new Date(rfp.upload_time).toLocaleDateString()}</span>
            {rfp.requirement_count > 0 && (
              <span>{rfp.requirement_count} requirements</span>
            )}
          </div>
        </Link>

        <div className="flex flex-col items-end gap-2">
          {deadline && daysLeft !== null && (
            <div
              className={`text-xs font-medium px-2 py-1 rounded-md ${
                daysLeft < 0
                  ? "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
                  : daysLeft <= 3
                  ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                  : daysLeft <= 7
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
              }`}
            >
              {daysLeft < 0
                ? "Past deadline"
                : daysLeft === 0
                ? "Due today"
                : `${daysLeft} days left`}
            </div>
          )}

          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ring-1 ${status.ring} ${status.color} hover:shadow-sm transition-all`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
              {status.label}
              <svg
                className="w-3 h-3 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-20 w-44 bg-white dark:bg-stone-900 rounded-lg ring-1 ring-stone-200 dark:ring-stone-700 shadow-lg overflow-hidden animate-fade-in-down origin-top-right">
                  {(Object.entries(TENDER_STATUS_LABELS) as [TenderStatus, typeof status][]).map(
                    ([key, val]) => (
                      <button
                        key={key}
                        onClick={() => {
                          onStatusChange(key);
                          setMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors flex items-center justify-between ${val.color}`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                          {val.label}
                        </span>
                        {rfp.tender_status === key && (
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
                      </button>
                    )
                  )}
                  <div className="border-t border-stone-100 dark:border-stone-800">
                    <button
                      onClick={() => {
                        onDelete();
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-1.5"
                    >
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22"
                        />
                      </svg>
                      Delete tender
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  hasAny,
  onUpload,
}: {
  hasAny: boolean;
  onUpload: () => void;
}) {
  return (
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
        {hasAny ? "No tenders in this status" : "No tenders yet"}
      </h3>
      <p className="text-sm text-stone-500 dark:text-stone-400 mb-5 max-w-sm mx-auto">
        {hasAny
          ? "Try a different filter or upload a new RFP to get started."
          : "Upload your first Etimad RFP to see the compliance matrix and draft your proposal."}
      </p>
      <button
        onClick={onUpload}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors"
      >
        Upload RFP
      </button>
    </div>
  );
}

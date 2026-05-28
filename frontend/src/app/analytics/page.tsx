"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { Reveal } from "@/components/reveal";
import { AnimatedCounter } from "@/components/animated-counter";
import {
  ConversionFunnel,
  DonutChart,
  Sparkline,
  StackedBarChart,
} from "@/components/charts";
import { listRFPs, RFPResponse } from "@/lib/api";
import { PLANS, useAuth } from "@/lib/auth";

type Period = "30d" | "90d" | "12mo" | "all";

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [rfps, setRfps] = useState<RFPResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("12mo");

  useEffect(() => {
    listRFPs()
      .then(setRfps)
      .finally(() => setLoading(false));
  }, []);

  const filteredRfps = useMemo(() => {
    if (period === "all") return rfps;
    const days = period === "30d" ? 30 : period === "90d" ? 90 : 365;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return rfps.filter((r) => new Date(r.upload_time).getTime() >= cutoff);
  }, [rfps, period]);

  const metrics = useMemo(() => {
    const won = filteredRfps.filter((r) => r.tender_status === "won");
    const lost = filteredRfps.filter((r) => r.tender_status === "lost");
    const submitted = filteredRfps.filter((r) => r.tender_status === "submitted");
    const inProgress = filteredRfps.filter((r) => r.tender_status === "in_progress");
    const draft = filteredRfps.filter((r) => r.tender_status === "draft");

    const decided = won.length + lost.length;
    const winRate = decided > 0 ? (won.length / decided) * 100 : 0;
    const submissionRate =
      filteredRfps.length > 0
        ? ((submitted.length + won.length + lost.length) / filteredRfps.length) * 100
        : 0;

    const wonValue = won.reduce((s, r) => s + (r.estimated_value_sar ?? 0), 0);
    const lostValue = lost.reduce((s, r) => s + (r.estimated_value_sar ?? 0), 0);
    const pipelineValue = [...inProgress, ...submitted].reduce(
      (s, r) => s + (r.estimated_value_sar ?? 0),
      0
    );
    const avgWonValue = won.length > 0 ? wonValue / won.length : 0;
    const totalBidValue = filteredRfps.reduce(
      (s, r) => s + (r.estimated_value_sar ?? 0),
      0
    );

    return {
      total: filteredRfps.length,
      won,
      lost,
      submitted,
      inProgress,
      draft,
      decided,
      winRate,
      submissionRate,
      wonValue,
      lostValue,
      pipelineValue,
      avgWonValue,
      totalBidValue,
    };
  }, [filteredRfps]);

  // Monthly time series for last 12 months
  const timeSeries = useMemo(() => {
    const months: { label: string; submissions: number; wins: number; key: string }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: d.toLocaleString("en-US", { month: "short" }),
        submissions: 0,
        wins: 0,
        key: `${d.getFullYear()}-${d.getMonth()}`,
      });
    }

    for (const r of rfps) {
      const d = new Date(r.upload_time);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const m = months.find((m) => m.key === key);
      if (!m) continue;
      if (["submitted", "won", "lost"].includes(r.tender_status)) m.submissions++;
      if (r.tender_status === "won") m.wins++;
    }
    return months;
  }, [rfps]);

  // Top buyers by win rate (min 1 decided bid)
  const topBuyers = useMemo(() => {
    const map = new Map<
      string,
      { buyer: string; total: number; won: number; lost: number; value: number }
    >();
    for (const r of filteredRfps) {
      if (!r.buyer) continue;
      const entry = map.get(r.buyer) ?? {
        buyer: r.buyer,
        total: 0,
        won: 0,
        lost: 0,
        value: 0,
      };
      entry.total++;
      if (r.tender_status === "won") {
        entry.won++;
        entry.value += r.estimated_value_sar ?? 0;
      }
      if (r.tender_status === "lost") entry.lost++;
      map.set(r.buyer, entry);
    }
    return Array.from(map.values())
      .filter((e) => e.total >= 1)
      .sort((a, b) => b.value - a.value || b.won - a.won)
      .slice(0, 6);
  }, [filteredRfps]);

  // ROI calculation
  const planMonthlyCost = user ? PLANS[user.plan].priceSar ?? 0 : 0;
  const monthsAsMember = user
    ? Math.max(
        1,
        Math.floor(
          (Date.now() - new Date(user.joinedAt).getTime()) /
            (1000 * 60 * 60 * 24 * 30)
        )
      )
    : 1;
  const totalPaid = planMonthlyCost * monthsAsMember;
  const roi =
    totalPaid > 0 ? ((metrics.wonValue - totalPaid) / totalPaid) * 100 : 0;
  const roiMultiple = totalPaid > 0 ? metrics.wonValue / totalPaid : 0;

  if (loading) {
    return (
      <main className="flex-1 bg-mesh dark:bg-stone-950 min-h-screen">
        <SiteNav />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-mesh dark:bg-stone-950 min-h-screen">
      <SiteNav />

      {/* Header */}
      <section className="px-6 pt-10 pb-6">
        <div className="max-w-7xl mx-auto flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-2">
              Analytics
            </p>
            <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
              Win-rate intelligence
            </h1>
            <p className="text-stone-600 dark:text-stone-400 mt-1">
              Track conversion across the bid pipeline.
            </p>
          </div>

          {/* Period selector */}
          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-white dark:bg-stone-900 ring-1 ring-stone-200 dark:ring-stone-800 shadow-sm">
            {(["30d", "90d", "12mo", "all"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  period === p
                    ? "bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 shadow-sm"
                    : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                }`}
              >
                {p === "12mo" ? "12 months" : p === "all" ? "All time" : p}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Hero metrics */}
      <section className="px-6 pb-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-5">
          {/* Win rate donut */}
          <Reveal>
            <div className="bg-white dark:bg-stone-900 rounded-3xl ring-1 ring-stone-200 dark:ring-stone-800 p-6 shadow-sm flex items-center gap-6">
              <DonutChart
                value={metrics.won.length}
                total={metrics.decided}
                label="Win rate"
                sublabel={`${metrics.won.length} of ${metrics.decided}`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">
                  Performance
                </p>
                <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                  {metrics.winRate >= 50
                    ? "Beating the market"
                    : metrics.winRate >= 30
                    ? "Above average"
                    : metrics.decided === 0
                    ? "No bids decided yet"
                    : "Room to grow"}
                </h2>
                <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                  Industry average for KSA SMEs is ~22%.
                </p>
                <div className="mt-3 flex items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {metrics.won.length} won
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    {metrics.lost.length} lost
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-stone-500 dark:text-stone-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                    {metrics.submitted.length + metrics.inProgress.length} pending
                  </span>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Stats grid */}
          <Reveal delay={100}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 h-full">
              <ValueTile
                label="Won Value"
                labelAr="القيمة المكتسبة"
                value={metrics.wonValue}
                color="emerald"
              />
              <ValueTile
                label="Pipeline"
                labelAr="قيد التقدم"
                value={metrics.pipelineValue}
                color="blue"
              />
              <ValueTile
                label="Avg Win"
                labelAr="متوسط الفوز"
                value={metrics.avgWonValue}
                color="amber"
              />
              <ValueTile
                label="Total Bid"
                labelAr="إجمالي العروض"
                value={metrics.totalBidValue}
                color="stone"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Main grid */}
      <section className="px-6 pb-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">
          {/* Submissions over time */}
          <Reveal>
            <div className="bg-white dark:bg-stone-900 rounded-3xl ring-1 ring-stone-200 dark:ring-stone-800 p-6 shadow-sm">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                    Submissions over time
                  </p>
                  <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                    Last 12 months
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1.5 text-stone-600 dark:text-stone-400">
                    <span className="w-3 h-3 rounded bg-stone-200 dark:bg-stone-700" />
                    Submitted
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                    <span className="w-3 h-3 rounded bg-gradient-to-t from-emerald-700 to-emerald-500" />
                    Won
                  </span>
                </div>
              </div>
              <StackedBarChart data={timeSeries} />
            </div>
          </Reveal>

          {/* Conversion funnel */}
          <Reveal delay={100}>
            <div className="bg-white dark:bg-stone-900 rounded-3xl ring-1 ring-stone-200 dark:ring-stone-800 p-6 shadow-sm h-full">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                Pipeline funnel
              </p>
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-5">
                Where bids land
              </h3>
              <ConversionFunnel
                stages={[
                  {
                    label: "Drafted",
                    labelAr: "مسودة",
                    count: metrics.total,
                  },
                  {
                    label: "Submitted",
                    labelAr: "مُقدّم",
                    count: metrics.submitted.length + metrics.won.length + metrics.lost.length,
                    value: metrics.wonValue + metrics.lostValue,
                  },
                  {
                    label: "Won",
                    labelAr: "فائز",
                    count: metrics.won.length,
                    value: metrics.wonValue,
                  },
                ]}
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Top buyers + ROI */}
      <section className="px-6 pb-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5" data-tour="analytics-roi">
          {/* Top buyers */}
          <Reveal>
            <div className="bg-white dark:bg-stone-900 rounded-3xl ring-1 ring-stone-200 dark:ring-stone-800 p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                Top buyers
              </p>
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-5">
                By won value
              </h3>

              {topBuyers.length === 0 ? (
                <div className="text-center py-12 text-stone-500 dark:text-stone-400">
                  <p className="text-sm">
                    No buyer data yet — upload more tenders to see trends.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {topBuyers.map((buyer) => {
                    const winRate =
                      buyer.won + buyer.lost > 0
                        ? Math.round(
                            (buyer.won / (buyer.won + buyer.lost)) * 100
                          )
                        : null;
                    return (
                      <div
                        key={buyer.buyer}
                        className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 py-3 border-b border-stone-100 dark:border-stone-800 last:border-0"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-stone-900 dark:text-stone-100 truncate">
                            {buyer.buyer}
                          </p>
                          <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                            {buyer.total} bid{buyer.total !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                            {buyer.won}W / {buyer.lost}L
                          </p>
                          {winRate !== null && (
                            <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5">
                              {winRate}% win rate
                            </p>
                          )}
                        </div>
                        <div className="w-20 sm:w-32 hidden sm:block">
                          <div className="h-1.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full"
                              style={{
                                width: winRate !== null ? `${winRate}%` : "0%",
                                transition:
                                  "width 1s cubic-bezier(0.16, 1, 0.3, 1)",
                              }}
                            />
                          </div>
                        </div>
                        <div className="text-right text-sm font-bold text-stone-900 dark:text-stone-100 tabular-nums min-w-[80px]">
                          {buyer.value > 0
                            ? `SAR ${(buyer.value / 1000000).toFixed(1)}M`
                            : "—"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Reveal>

          {/* ROI card */}
          <Reveal delay={100}>
            <div className="bg-gradient-to-br from-emerald-800 via-emerald-900 to-stone-900 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl h-full">
              <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full border border-emerald-700/40 animate-rotate-slow" />
              <div
                className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full border border-emerald-700/30 animate-rotate-slow"
                style={{ animationDirection: "reverse" }}
              />

              <div className="relative">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300 mb-2">
                  ROI on Etimad Copilot
                </p>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-5xl font-bold tracking-tight">
                    <AnimatedCounter value={roiMultiple} decimals={1} />
                    <span className="text-2xl text-emerald-200/70 ml-1">x</span>
                  </span>
                </div>
                <p className="text-sm text-emerald-100/70 mb-5">
                  Return on subscription
                </p>

                <div className="space-y-3 pt-4 border-t border-white/10">
                  <ROILine
                    label="Total won value"
                    value={`SAR ${(metrics.wonValue / 1000000).toFixed(2)}M`}
                  />
                  <ROILine
                    label={`Subscription · ${monthsAsMember} mo${monthsAsMember !== 1 ? "s" : ""}`}
                    value={`SAR ${totalPaid.toLocaleString()}`}
                  />
                  <ROILine
                    label="Net gain"
                    value={`SAR ${((metrics.wonValue - totalPaid) / 1000000).toFixed(2)}M`}
                    highlight
                  />
                </div>

                {roi > 0 && (
                  <div className="mt-5 p-3 rounded-xl bg-white/5 ring-1 ring-white/10">
                    <p className="text-xs text-emerald-100/80 leading-relaxed">
                      <span className="font-semibold text-emerald-300">
                        {roi >= 100 ? `${Math.round(roi).toLocaleString()}%` : `${roi.toFixed(0)}%`}
                      </span>{" "}
                      return — one winning tender has already paid for years of
                      subscription.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}

function ValueTile({
  label,
  labelAr,
  value,
  color,
}: {
  label: string;
  labelAr: string;
  value: number;
  color: "emerald" | "blue" | "amber" | "stone";
}) {
  const colorMap = {
    emerald: "text-emerald-700 dark:text-emerald-400",
    blue: "text-blue-700 dark:text-blue-400",
    amber: "text-amber-700 dark:text-amber-400",
    stone: "text-stone-900 dark:text-stone-100",
  };

  const formatted =
    value >= 1000000
      ? `${(value / 1000000).toFixed(1)}M`
      : value >= 1000
      ? `${(value / 1000).toFixed(0)}K`
      : value.toFixed(0);

  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl ring-1 ring-stone-200 dark:ring-stone-800 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
        {label}
      </p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-xs font-medium text-stone-400">SAR</span>
        <span className={`text-2xl font-bold tracking-tight tabular-nums ${colorMap[color]}`}>
          {formatted}
        </span>
      </div>
      <p
        className="text-[10px] text-stone-400 dark:text-stone-500 mt-1"
        dir="rtl"
      >
        {labelAr}
      </p>
    </div>
  );
}

function ROILine({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between text-sm ${
        highlight ? "pt-3 border-t border-white/10" : ""
      }`}
    >
      <span className={highlight ? "font-semibold text-white" : "text-emerald-100/70"}>
        {label}
      </span>
      <span
        className={`tabular-nums font-bold ${
          highlight ? "text-emerald-300" : "text-white"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

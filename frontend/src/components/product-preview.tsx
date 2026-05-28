"use client";

import { useEffect, useState } from "react";

/** A floating 3D-tilted mockup of the platform UI — for the hero "see it" moment. */
export function ProductPreview() {
  const [score, setScore] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    function tick(t: number) {
      const elapsed = t - start;
      const p = Math.min(elapsed / 1400, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setScore(Math.round(99 * eased));
      setProgress(Math.round(78 * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="relative w-full max-w-4xl mx-auto pointer-events-none select-none">
      {/* Backdrop glow */}
      <div
        className="absolute -inset-x-20 -top-10 -bottom-20 blur-3xl opacity-50"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(16, 185, 129, 0.4) 0%, transparent 60%)",
        }}
      />

      <div
        className="relative"
        style={{
          transform: "perspective(1800px) rotateX(8deg) rotateY(-2deg)",
          transformStyle: "preserve-3d",
        }}
      >
        {/* Floating card 1 — match score */}
        <div
          className="absolute -left-6 top-12 z-20 animate-float-1 hidden sm:block"
          style={{ transform: "translateZ(80px)" }}
        >
          <div className="bg-white dark:bg-stone-900 rounded-2xl ring-1 ring-stone-200 dark:ring-stone-700 shadow-elev-4 p-4 w-56">
            <div className="flex items-center gap-3">
              <div className="relative w-14 h-14 flex-shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" className="text-emerald-100 dark:text-stone-800" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.5" fill="none"
                    stroke="url(#previewGrad)" strokeWidth="3"
                    strokeDasharray={`${score} 100`}
                    strokeLinecap="round" pathLength="100"
                    style={{ transition: "stroke-dasharray 0.4s" }}
                  />
                  <defs>
                    <linearGradient id="previewGrad" x1="0" x2="1" y1="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#047857" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-stone-900 dark:text-stone-100">
                  {score}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-0.5">
                  Strong fit
                </div>
                <div className="text-xs font-semibold text-stone-900 dark:text-stone-100 leading-tight">
                  NEOM Smart City Citizen Services
                </div>
                <div className="text-[10px] text-stone-400 mt-0.5">
                  21 days left
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating card 2 — proposal generated */}
        <div
          className="absolute -right-4 top-8 z-20 animate-float-2 hidden sm:block"
          style={{ transform: "translateZ(100px)", animationDelay: "-2s" }}
        >
          <div className="bg-white dark:bg-stone-900 rounded-2xl ring-1 ring-stone-200 dark:ring-stone-700 shadow-elev-4 p-4 w-52">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Proposal ready
              </span>
            </div>
            <div className="text-xs font-semibold text-stone-900 dark:text-stone-100">
              Technical + Financial
            </div>
            <div className="text-[10px] text-stone-400 mt-1">
              1,432 words · 47 requirements mapped
            </div>
          </div>
        </div>

        {/* Floating card 3 — bottom right pricing */}
        <div
          className="absolute -right-8 bottom-12 z-20 animate-float-1 hidden md:block"
          style={{ transform: "translateZ(60px)", animationDelay: "-3s" }}
        >
          <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 text-white rounded-2xl shadow-elev-4 p-4 w-48 ring-1 ring-emerald-700/40">
            <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-300 mb-1">
              Total bid
            </div>
            <div className="text-2xl font-bold tabular-nums">
              SAR <span className="tabular-nums">{(47.85).toFixed(2)}M</span>
            </div>
            <div className="text-[10px] text-emerald-200/70 mt-1">
              Generated in 76s
            </div>
          </div>
        </div>

        {/* Main app preview card */}
        <div className="relative bg-white dark:bg-stone-900 rounded-3xl shadow-elev-4 ring-1 ring-stone-200/80 dark:ring-stone-800 overflow-hidden">
          {/* Window chrome */}
          <div className="flex items-center gap-2 px-5 py-3 border-b border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/30">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            </div>
            <div className="flex-1 text-center">
              <span className="text-[10px] font-mono text-stone-400">
                etimad-copilot.app/dashboard
              </span>
            </div>
            <div className="w-12" />
          </div>

          {/* App content */}
          <div className="p-6 space-y-4">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-0.5">
                  Tender pipeline
                </div>
                <div className="text-base font-bold text-stone-900 dark:text-stone-100">
                  Your Active Tenders
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-800 text-white text-[10px] font-semibold">
                + New Tender
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Total", value: "14", color: "text-stone-900 dark:text-stone-100" },
                { label: "Active", value: "9", color: "text-blue-700 dark:text-blue-300" },
                { label: "Submitted", value: "3", color: "text-amber-700 dark:text-amber-300" },
                { label: "Won", value: "2", color: "text-emerald-700 dark:text-emerald-300" },
              ].map((s, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-800/60 ring-1 ring-stone-100 dark:ring-stone-800">
                  <div className={`text-lg font-bold ${s.color} tabular-nums`}>{s.value}</div>
                  <div className="text-[9px] text-stone-500 dark:text-stone-400 uppercase tracking-wider">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Tender rows */}
            <div className="space-y-2">
              {[
                { title: "Hospital Information System Modernization", buyer: "Ministry of Health", value: "47.5M", days: "32d", status: "In Progress", statusColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
                { title: "Population Census Data Pipeline", buyer: "GASTAT", value: "89.0M", days: "45d", status: "Draft", statusColor: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300" },
                { title: "Smart City Citizen Services App", buyer: "NEOM", value: "22.5M", days: "28d", status: "In Progress", statusColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
              ].map((t, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg ring-1 ring-stone-100 dark:ring-stone-800 bg-white dark:bg-stone-900">
                  <div className="w-7 h-7 rounded-md bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-[10px] font-bold text-stone-500">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">
                      {t.title}
                    </div>
                    <div className="text-[10px] text-stone-500 mt-0.5">
                      {t.buyer} · SAR {t.value}
                    </div>
                  </div>
                  <div className={`px-2 py-0.5 rounded text-[9px] font-semibold ${t.statusColor}`}>
                    {t.status}
                  </div>
                  <div className="text-[10px] font-semibold text-stone-700 dark:text-stone-300 tabular-nums">
                    {t.days}
                  </div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="mt-3 p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/20 ring-1 ring-emerald-200/50 dark:ring-emerald-900/40">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[10px] font-semibold text-emerald-900 dark:text-emerald-300">
                  Profile completeness
                </div>
                <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {progress}%
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-700 rounded-full"
                  style={{
                    width: `${progress}%`,
                    transition: "width 0.6s var(--ease-out-expo)",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

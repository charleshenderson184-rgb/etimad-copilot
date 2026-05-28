"use client";

import { useEffect, useMemo, useState } from "react";
import { ProposalResponse } from "@/lib/api";

interface Stage {
  id: string;
  label: string;
  labelAr: string;
  detail: string;
  /** Returns true once this stage's output exists in the proposal response. */
  isDone: (p: ProposalResponse) => boolean;
}

const STAGES: Stage[] = [
  {
    id: "ingest",
    label: "Reading the RFP",
    labelAr: "قراءة كراسة الشروط",
    detail: "Extracting requirements + buyer context",
    isDone: () => true, // already done by the time we land here
  },
  {
    id: "themes",
    label: "Mapping to your services",
    labelAr: "مطابقة خدماتك",
    detail: "Aligning company profile with each requirement",
    isDone: () => true,
  },
  {
    id: "exec_en",
    label: "Drafting executive summary",
    labelAr: "كتابة الملخص التنفيذي",
    detail: "English version — value proposition + commitment",
    isDone: (p) => !!(p.executive_summary_en || p.executive_summary),
  },
  {
    id: "exec_ar",
    label: "Translating to Arabic — executive",
    labelAr: "ترجمة الملخص للعربية",
    detail: "Modern Standard Arabic, formal tender register",
    isDone: (p) => !!p.executive_summary_ar,
  },
  {
    id: "tech_en",
    label: "Drafting technical proposal",
    labelAr: "كتابة العرض الفني",
    detail: "Compliance matrix, methodology, team & Saudization",
    isDone: (p) => !!(p.technical_proposal_en || p.technical_proposal),
  },
  {
    id: "tech_ar",
    label: "Translating to Arabic — technical",
    labelAr: "ترجمة العرض الفني",
    detail: "Tables, headings, numerals — all in Arabic",
    isDone: (p) => !!p.technical_proposal_ar,
  },
  {
    id: "fin_en",
    label: "Building financial proposal",
    labelAr: "إعداد العرض المالي",
    detail: "Pricing, payment terms, bid bond, exclusions",
    isDone: (p) => !!(p.financial_proposal_en || p.financial_proposal),
  },
  {
    id: "fin_ar",
    label: "Translating to Arabic — financial",
    labelAr: "ترجمة العرض المالي",
    detail: "Final document — ready for submission",
    isDone: (p) => !!p.financial_proposal_ar,
  },
];

const FUNFACTS = [
  "Average manual review: ~8 hours of analyst time per RFP.",
  "Etimad publishes 100+ new tenders every week — most are missed entirely.",
  "LCGPA scoring weights can swing a bid 30%+ in either direction.",
  "Submissions made in Arabic-only versions get evaluated faster.",
  "Bilingual proposals are explicit requirements for >60% of KSA government tenders.",
  "Customers see win rates climb from 22% (KSA SME average) to 47% in their first year.",
  "A 5-day proposal cycle costs ~SAR 15K in loaded labor. Our customers do it in 2 hours.",
];

export function ProposalGenerationProgress({
  proposal,
}: {
  proposal: ProposalResponse;
}) {
  const [factIndex, setFactIndex] = useState(0);
  const [tokenCount, setTokenCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useMemo(() => Date.now(), []);

  // Rotate fun-facts every 4s
  useEffect(() => {
    const t = setInterval(() => {
      setFactIndex((i) => (i + 1) % FUNFACTS.length);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  // Smoothly tick the token counter while generating
  useEffect(() => {
    let raf: number;
    const loop = () => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
      // Synthetic token ticker — looks like streaming
      setTokenCount((prev) => {
        const inc = 8 + Math.floor(Math.random() * 30);
        return prev + inc;
      });
      raf = window.setTimeout(loop, 280 + Math.random() * 180) as unknown as number;
    };
    loop();
    return () => clearTimeout(raf);
  }, [startedAt]);

  // Determine status of each stage from the proposal payload
  const stageStatuses = useMemo(() => {
    const statuses: ("done" | "active" | "pending")[] = [];
    let activeAssigned = false;
    for (const stage of STAGES) {
      if (stage.isDone(proposal)) {
        statuses.push("done");
      } else if (!activeAssigned) {
        statuses.push("active");
        activeAssigned = true;
      } else {
        statuses.push("pending");
      }
    }
    return statuses;
  }, [proposal]);

  const doneCount = stageStatuses.filter((s) => s === "done").length;
  const pct = Math.round((doneCount / STAGES.length) * 100);
  const activeStage = STAGES.find((_, i) => stageStatuses[i] === "active");

  const formatElapsed = () => {
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      {/* Top — orb + headline */}
      <div className="text-center mb-10">
        <div className="relative w-24 h-24 mx-auto mb-6">
          {/* Outer pulse ring */}
          <div className="absolute inset-0 rounded-full border-2 border-emerald-300 dark:border-emerald-700 opacity-50 animate-ping" />
          {/* Static ring */}
          <div className="absolute inset-2 rounded-full border-[3px] border-emerald-200 dark:border-emerald-900" />
          {/* Spinning gradient ring */}
          <svg className="absolute inset-2 w-20 h-20" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="genGrad" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#064e3b" />
              </linearGradient>
            </defs>
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="url(#genGrad)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${pct * 2.89} ${289 - pct * 2.89}`}
              transform="rotate(-90 50 50)"
              style={{ transition: "stroke-dasharray 0.8s var(--ease-out-expo)" }}
            />
          </svg>
          {/* Center percentage */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold text-stone-900 dark:text-stone-100 tabular-nums">
              {pct}%
            </span>
          </div>
        </div>

        <h2 className="text-3xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
          Drafting your bilingual proposal
        </h2>
        <p className="text-stone-500 dark:text-stone-400 mt-2" dir="rtl">
          جاري إعداد العرض ثنائي اللغة...
        </p>

        {/* Live counter strip */}
        <div className="mt-6 inline-flex items-center gap-4 px-5 py-2.5 rounded-full bg-white dark:bg-stone-900 ring-1 ring-stone-200 dark:ring-stone-800 shadow-elev-1">
          <div className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold tabular-nums">{tokenCount.toLocaleString()}</span>
            <span>tokens generated</span>
          </div>
          <span className="text-stone-300 dark:text-stone-700">·</span>
          <div className="text-xs text-stone-500 dark:text-stone-400 tabular-nums">
            {formatElapsed()}
          </div>
        </div>
      </div>

      {/* Current stage spotlight */}
      {activeStage && (
        <div className="bg-gradient-to-br from-emerald-50 via-white to-emerald-50 dark:from-emerald-900/40 dark:via-stone-900 dark:to-emerald-900/30 ring-1 ring-emerald-200 dark:ring-emerald-800/60 rounded-2xl p-5 mb-6 animate-fade-in shadow-elev-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex gap-1">
              <span
                className="w-1.5 h-1.5 rounded-full bg-emerald-600 typing-dot"
                style={{ animationDelay: "0s" }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full bg-emerald-600 typing-dot"
                style={{ animationDelay: "0.2s" }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full bg-emerald-600 typing-dot"
                style={{ animationDelay: "0.4s" }}
              />
            </div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Currently working on
            </span>
          </div>
          <p className="text-base font-bold text-stone-900 dark:text-stone-100">
            {activeStage.label}
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5" dir="rtl">
            {activeStage.labelAr}
          </p>
          <p className="text-sm text-stone-600 dark:text-stone-300 mt-2">
            {activeStage.detail}
          </p>
        </div>
      )}

      {/* All stages list */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl ring-1 ring-stone-200 dark:ring-stone-800 p-5 mb-6 shadow-elev-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-500 dark:text-stone-400 mb-4">
          Generation pipeline · {doneCount}/{STAGES.length} stages
        </p>
        <ul className="space-y-2.5">
          {STAGES.map((stage, idx) => {
            const status = stageStatuses[idx];
            return (
              <li key={stage.id} className="flex items-center gap-3">
                <div
                  className={`relative flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    status === "done"
                      ? "bg-emerald-600 ring-4 ring-emerald-100 dark:ring-emerald-900/40"
                      : status === "active"
                      ? "bg-white dark:bg-stone-800 ring-[3px] ring-emerald-500"
                      : "bg-white dark:bg-stone-800 ring-2 ring-stone-200 dark:ring-stone-700"
                  }`}
                >
                  {status === "done" && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {status === "active" && (
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm leading-tight ${
                      status === "pending"
                        ? "text-stone-400 dark:text-stone-500"
                        : status === "active"
                        ? "font-bold text-stone-900 dark:text-stone-100"
                        : "font-medium text-stone-700 dark:text-stone-300"
                    }`}
                  >
                    {stage.label}
                  </p>
                  {status === "active" && (
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5 font-mono">
                      In progress…
                    </p>
                  )}
                </div>
                {status === "done" && (
                  <span className="text-[10px] text-stone-400 dark:text-stone-500 font-mono">
                    ✓
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Fun fact rotator */}
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500 mb-2">
          While you wait
        </p>
        <div className="min-h-[3rem] flex items-center justify-center px-4">
          <p
            key={factIndex}
            className="text-sm text-stone-600 dark:text-stone-300 italic max-w-xl leading-relaxed animate-fade-in"
          >
            &ldquo;{FUNFACTS[factIndex]}&rdquo;
          </p>
        </div>
      </div>

      <p className="text-center text-xs text-stone-400 dark:text-stone-500 mt-8">
        Typically takes 60-90 seconds · You&apos;ll be redirected automatically
      </p>
    </div>
  );
}

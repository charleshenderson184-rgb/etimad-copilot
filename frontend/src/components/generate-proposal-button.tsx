"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createProposal } from "@/lib/api";
import { PLANS, ProposalMode, useAuth } from "@/lib/auth";

type Language = "en" | "ar" | "bilingual";

const MODES: {
  mode: ProposalMode;
  lang: Language;
  title: string;
  titleAr: string;
  credits: number;
  blurb: string;
  recommended?: boolean;
}[] = [
  {
    mode: "single",
    lang: "en",
    title: "English only",
    titleAr: "إنجليزي فقط",
    credits: 1,
    blurb: "One complete English proposal. Best when the buyer accepts English-only submissions.",
  },
  {
    mode: "single",
    lang: "ar",
    title: "Arabic only",
    titleAr: "عربي فقط",
    credits: 1,
    blurb: "One complete Arabic proposal. Best when Arabic is the only required language.",
  },
  {
    mode: "bilingual",
    lang: "bilingual",
    title: "Bilingual (recommended)",
    titleAr: "ثنائي اللغة (موصى به)",
    credits: 2,
    blurb: "Two separate documents — one English, one Arabic. Required for most KSA government tenders.",
    recommended: true,
  },
];

export function GenerateProposalButton({ rfpId }: { rfpId: string }) {
  const router = useRouter();
  const { user, trackProposalCredits } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(2); // default to bilingual
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choice = MODES[selectedIdx];
  const plan = user ? PLANS[user.plan] : null;
  const creditsRemaining =
    plan && plan.limits.proposals_per_month !== "unlimited"
      ? plan.limits.proposals_per_month -
        (user?.usage.proposal_credits_spent ?? 0)
      : null;
  const insufficient =
    creditsRemaining !== null && creditsRemaining < choice.credits;

  const handleGenerate = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const proposal = await createProposal(rfpId, choice.lang);
      trackProposalCredits(choice.mode);
      router.push(`/proposal/${proposal.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start proposal generation");
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-900 text-white text-sm font-semibold hover:shadow-lg hover:from-emerald-600 hover:to-emerald-800 transition-all shadow-md"
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
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        Generate Proposal
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-fade-in"
          onClick={() => !submitting && setOpen(false)}
        >
          <div
            className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl max-w-xl w-full p-6 ring-1 ring-stone-200 dark:ring-stone-800 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/40 dark:to-emerald-900/20 ring-1 ring-emerald-200/50 dark:ring-emerald-800/50 mb-4">
                  <svg className="w-5 h-5 text-emerald-700 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                  Generate Full Proposal
                </h2>
                <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5" dir="rtl">
                  إنشاء عرض متكامل
                </p>
              </div>

              {plan && creditsRemaining !== null && (
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    Credits left
                  </p>
                  <p className="text-2xl font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                    {creditsRemaining}
                    <span className="text-sm text-stone-400 dark:text-stone-500 ml-1">
                      / {plan.limits.proposals_per_month}
                    </span>
                  </p>
                  <p className="text-[10px] text-stone-400 dark:text-stone-500">
                    {plan.label} plan
                  </p>
                </div>
              )}
            </div>

            <p className="text-sm text-stone-600 dark:text-stone-400 mt-3 mb-5 leading-relaxed">
              Choose the output. Bilingual is two separate documents — required for most KSA government submissions.
            </p>

            {/* Mode selector */}
            <div className="space-y-2 mb-5">
              {MODES.map((m, i) => {
                const isSelected = i === selectedIdx;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedIdx(i)}
                    className={`w-full text-left p-4 rounded-xl transition-all ${
                      isSelected
                        ? "bg-emerald-50 dark:bg-emerald-900/30 ring-2 ring-emerald-500 shadow-sm"
                        : "bg-white dark:bg-stone-800/60 ring-1 ring-stone-200 dark:ring-stone-700 hover:ring-stone-300 dark:hover:ring-stone-600"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex-shrink-0 w-5 h-5 rounded-full mt-0.5 flex items-center justify-center transition-all ${
                          isSelected
                            ? "bg-emerald-600"
                            : "ring-2 ring-stone-300 dark:ring-stone-600 bg-white dark:bg-stone-900"
                        }`}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                              {m.title}
                            </p>
                            {m.recommended && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-600 text-white">
                                Recommended
                              </span>
                            )}
                          </div>
                          <div className="inline-flex items-center gap-1 text-xs font-bold text-stone-700 dark:text-stone-300">
                            <span className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 tabular-nums">
                              {m.credits} {m.credits === 1 ? "credit" : "credits"}
                            </span>
                          </div>
                        </div>
                        <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5" dir="rtl">
                          {m.titleAr}
                        </p>
                        <p className="text-xs text-stone-600 dark:text-stone-400 mt-2 leading-relaxed">
                          {m.blurb}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Cost breakdown */}
            <div className="p-3 rounded-lg bg-stone-50 dark:bg-stone-800/40 ring-1 ring-stone-200/60 dark:ring-stone-700/60 mb-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-500 dark:text-stone-400">This will use</span>
                <span className="font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                  {choice.credits} {choice.credits === 1 ? "credit" : "credits"}
                </span>
              </div>
              {creditsRemaining !== null && (
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-stone-500 dark:text-stone-400">Remaining after</span>
                  <span
                    className={`font-bold tabular-nums ${
                      insufficient ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-300"
                    }`}
                  >
                    {Math.max(0, creditsRemaining - choice.credits)} credits
                  </span>
                </div>
              )}
              {insufficient && (
                <p className="text-[10px] text-red-600 dark:text-red-400 mt-2">
                  Not enough credits. Upgrade your plan or choose a single-language option.
                </p>
              )}
            </div>

            <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
              Takes about {choice.mode === "bilingual" ? "90-120" : "60-90"} seconds. We use prompt caching to keep costs low.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="px-4 py-2 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={submitting || insufficient}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                    Starting...
                  </>
                ) : (
                  <>Generate</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

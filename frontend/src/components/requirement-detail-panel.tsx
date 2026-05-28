"use client";

import { useEffect, useState } from "react";
import { RequirementResponse, rfpPageImageUrl } from "@/lib/api";
import { CommentsPanel } from "@/components/comments-panel";

const CATEGORY_LABELS: Record<
  string,
  { en: string; ar: string; tone: string }
> = {
  technical: { en: "Technical", ar: "فني", tone: "blue" },
  commercial: { en: "Commercial", ar: "مالي", tone: "amber" },
  legal: { en: "Legal", ar: "قانوني", tone: "purple" },
  lcgpa: { en: "LCGPA", ar: "محتوى محلي", tone: "emerald" },
  administrative: { en: "Admin", ar: "إداري", tone: "stone" },
};

const STATUS_LABELS: Record<string, { en: string; tone: string }> = {
  pending: { en: "Pending review", tone: "stone" },
  compliant: { en: "Compliant", tone: "emerald" },
  gap: { en: "Gap", tone: "red" },
  unclear: { en: "Needs clarification", tone: "amber" },
};

interface Props {
  open: boolean;
  onClose: () => void;
  requirement: RequirementResponse | null;
  rfpId: string;
}

export function RequirementDetailPanel({
  open,
  onClose,
  requirement,
  rfpId,
}: Props) {
  const [pageImgFailed, setPageImgFailed] = useState(false);

  useEffect(() => {
    setPageImgFailed(false);
  }, [requirement?.id]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || !requirement) return null;

  const cat = CATEGORY_LABELS[requirement.category] || CATEGORY_LABELS.technical;
  const status = STATUS_LABELS[requirement.compliance_status] || STATUS_LABELS.pending;
  const isArabicHeavy =
    (requirement.requirement_text.match(/[؀-ۿ]/g)?.length ?? 0) >
    requirement.requirement_text.length * 0.3;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-stone-950/50 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
      />

      {/* Slide-out drawer */}
      <aside
        className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[640px] max-w-full bg-white dark:bg-stone-950 shadow-elev-4 ring-1 ring-stone-200 dark:ring-stone-800 overflow-y-auto"
        style={{
          animation: "fade-in-down 0.4s var(--ease-out-expo) both",
        }}
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-stone-950/95 backdrop-blur-md border-b border-stone-100 dark:border-stone-800 p-5 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <CategoryBadge tone={cat.tone} labelEn={cat.en} labelAr={cat.ar} />
              <StatusBadge tone={status.tone} label={status.en} />
              {requirement.is_mandatory && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 ring-1 ring-red-200 dark:ring-red-800/60">
                  <span className="w-1 h-1 rounded-full bg-red-600 animate-pulse" />
                  Mandatory
                </span>
              )}
            </div>
            <p className="text-[10px] font-mono font-bold tracking-wider text-stone-400 dark:text-stone-500">
              REQ-{requirement.id.slice(0, 8).toUpperCase()}
              {requirement.source_page && ` · page ${requirement.source_page}`}
              {requirement.scoring_weight && ` · weight ${requirement.scoring_weight}%`}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex-shrink-0 p-1.5 rounded-lg text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* The requirement itself */}
          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-400 mb-3">
              Requirement
            </h3>
            <blockquote
              className="bg-emerald-50/40 dark:bg-emerald-900/20 border-l-4 border-emerald-500 dark:border-emerald-600 pl-4 py-3 pr-3 rounded-r-lg"
              dir={isArabicHeavy ? "rtl" : "ltr"}
            >
              <p className="text-base font-semibold text-stone-900 dark:text-stone-100 leading-relaxed">
                {requirement.requirement_text}
              </p>
            </blockquote>
            {requirement.requirement_text_en &&
              requirement.requirement_text_en !== requirement.requirement_text && (
                <details className="mt-2 group">
                  <summary className="cursor-pointer text-xs font-semibold text-stone-500 dark:text-stone-400 hover:text-emerald-700 dark:hover:text-emerald-400 inline-flex items-center gap-1">
                    <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    Show {isArabicHeavy ? "English" : "Arabic"} translation
                  </summary>
                  <p className="mt-2 text-sm text-stone-600 dark:text-stone-400 leading-relaxed pl-4">
                    {requirement.requirement_text_en}
                  </p>
                </details>
              )}
          </section>

          {/* Source page preview */}
          {requirement.source_page && (
            <section>
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-400 mb-3">
                Source · page {requirement.source_page}
              </h3>
              {pageImgFailed ? (
                <div className="rounded-xl ring-1 ring-stone-200 dark:ring-stone-800 bg-stone-50 dark:bg-stone-900 p-8 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-stone-100 dark:bg-stone-800 mb-3">
                    <svg className="w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    Original PDF not available for this tender.
                  </p>
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                    Source reference: page {requirement.source_page}
                  </p>
                </div>
              ) : (
                <div className="relative rounded-xl ring-1 ring-stone-200 dark:ring-stone-800 overflow-hidden bg-stone-100 dark:bg-stone-900 shadow-elev-2">
                  <img
                    src={rfpPageImageUrl(rfpId, requirement.source_page)}
                    alt={`RFP page ${requirement.source_page}`}
                    className="w-full block"
                    onError={() => setPageImgFailed(true)}
                    loading="lazy"
                  />
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-stone-900/80 backdrop-blur text-white text-[10px] font-mono font-bold">
                    p. {requirement.source_page}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Analyst notes / scoring weight */}
          {(requirement.notes || requirement.scoring_weight) && (
            <section>
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-400 mb-3">
                Analyst notes
              </h3>
              {requirement.scoring_weight && (
                <div className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800/60 text-xs font-semibold">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Scoring weight: {requirement.scoring_weight}% of total
                </div>
              )}
              {requirement.notes && (
                <div className="rounded-xl bg-stone-50 dark:bg-stone-900 ring-1 ring-stone-200 dark:ring-stone-800 p-4">
                  <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-wrap" dir="auto">
                    {requirement.notes}
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Compliance status — quick edit */}
          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-400 mb-3">
              Your status
            </h3>
            <div className="rounded-xl bg-stone-50 dark:bg-stone-900 ring-1 ring-stone-200 dark:ring-stone-800 p-4">
              <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                {status.en}
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                Update from the compliance matrix to track your readiness.
              </p>
            </div>
          </section>

          {/* Per-requirement discussion */}
          <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-700 dark:text-emerald-400 mb-3">
              Discussion
            </h3>
            <CommentsPanel targetType="requirement" targetId={requirement.id} />
          </section>
        </div>
      </aside>
    </>
  );
}

function CategoryBadge({
  tone,
  labelEn,
  labelAr,
}: {
  tone: string;
  labelEn: string;
  labelAr: string;
}) {
  const styles: Record<string, string> = {
    blue: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-blue-200 dark:ring-blue-800/60",
    amber: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 ring-amber-200 dark:ring-amber-800/60",
    purple: "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 ring-purple-200 dark:ring-purple-800/60",
    emerald: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-800/60",
    stone: "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 ring-stone-200 dark:ring-stone-700",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ring-1 ${styles[tone]}`}>
      {labelEn}
      <span className="opacity-60" dir="rtl">{labelAr}</span>
    </span>
  );
}

function StatusBadge({ tone, label }: { tone: string; label: string }) {
  const styles: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    red: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    stone: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${styles[tone]}`}>
      {label}
    </span>
  );
}

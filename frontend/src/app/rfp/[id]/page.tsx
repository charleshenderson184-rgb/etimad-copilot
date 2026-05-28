"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getRFP, getRequirements } from "@/lib/api";
import type { RFPResponse, RequirementResponse } from "@/lib/api";
import { ComplianceMatrix } from "@/components/compliance-matrix";
import { GenerateProposalButton } from "@/components/generate-proposal-button";
import { SiteNav } from "@/components/site-nav";
import { ActivityFeed } from "@/components/activity-feed";
import { CommentsPanel } from "@/components/comments-panel";

export default function RFPPage() {
  const params = useParams();
  const id = params.id as string;

  const [rfp, setRfp] = useState<RFPResponse | null>(null);
  const [requirements, setRequirements] = useState<RequirementResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function poll() {
      try {
        const data = await getRFP(id);
        if (cancelled) return;
        setRfp(data);

        if (data.status === "completed") {
          const reqs = await getRequirements(id);
          if (!cancelled) setRequirements(reqs);
        } else if (data.status === "processing") {
          setTimeout(poll, 2000);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load RFP"
          );
        }
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <main className="flex-1 bg-mesh flex flex-col items-center justify-center px-4 py-16">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-50 ring-1 ring-red-200/60 mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-stone-900 mb-2">Something went wrong</h1>
          <p className="text-stone-600 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Try another RFP
          </Link>
        </div>
      </main>
    );
  }

  if (!rfp) {
    return (
      <main className="flex-1 flex items-center justify-center bg-mesh">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-100" />
            <div className="absolute inset-0 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin" />
          </div>
          <p className="text-sm text-stone-500">Loading...</p>
        </div>
      </main>
    );
  }

  const langLabel =
    rfp.language === "ar"
      ? "Arabic · عربي"
      : rfp.language === "en"
      ? "English"
      : rfp.language === "mixed"
      ? "Bilingual · ثنائي"
      : null;

  return (
    <main className="flex-1 bg-mesh">
      <SiteNav />

      {/* Document header */}
      <section className="px-6 pt-8 pb-2">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white ring-1 ring-stone-200 shadow-sm flex items-center justify-center">
                <svg className="w-5 h-5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-stone-900 truncate">
                  {rfp.filename}
                </h1>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-stone-500">
                  {rfp.page_count && (
                    <span className="inline-flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {rfp.page_count} pages
                    </span>
                  )}
                  {langLabel && <span>· {langLabel}</span>}
                  <span>
                    · {new Date(rfp.upload_time).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {rfp.status === "completed" && (
              <GenerateProposalButton rfpId={rfp.id} />
            )}
          </div>
        </div>
      </section>

      {/* Status-dependent content */}
      <section className="px-6 py-8">
        {rfp.status === "processing" && (
          <div className="max-w-2xl mx-auto text-center py-20 animate-fade-in">
            <div className="relative w-20 h-20 mx-auto mb-8">
              <div className="absolute inset-0 rounded-full border-[5px] border-emerald-100" />
              <div className="absolute inset-0 rounded-full border-[5px] border-emerald-600 border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-stone-900 mb-2">
              Analyzing your tender
            </h2>
            <p className="text-stone-500" dir="rtl">جاري التحليل...</p>
            <div className="mt-8 max-w-md mx-auto">
              <div className="space-y-3 text-left">
                <ProgressStep label="Extracting text from PDF" done />
                <ProgressStep label="Detecting language and structure" done />
                <ProgressStep label="Extracting requirements" active />
                <ProgressStep label="Generating gap analysis" />
              </div>
            </div>
            <p className="text-xs text-stone-400 mt-8">
              Typically takes 15-30 seconds
            </p>
          </div>
        )}

        {rfp.status === "error" && (
          <div className="max-w-md mx-auto text-center py-20 animate-fade-in">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-50 ring-1 ring-red-200/60 mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-stone-900 mb-2">
              Analysis failed
            </h2>
            <p className="text-stone-600 text-sm">{rfp.error_message}</p>
          </div>
        )}

        {rfp.status === "completed" && (
          <ComplianceMatrix requirements={requirements} rfpId={rfp.id} />
        )}

        <div className="mt-8 max-w-3xl grid gap-6 lg:grid-cols-[1fr_360px]">
          <CommentsPanel targetType="rfp" targetId={rfp.id} />
          <ActivityFeed
            entityType="rfp"
            entityId={rfp.id}
            title="Tender activity"
            limit={30}
          />
        </div>
      </section>
    </main>
  );
}

function ProgressStep({
  label,
  done,
  active,
}: {
  label: string;
  done?: boolean;
  active?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
          done
            ? "bg-emerald-600"
            : active
            ? "bg-white ring-2 ring-emerald-600"
            : "bg-white ring-2 ring-stone-200"
        }`}
      >
        {done && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {active && (
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
        )}
      </div>
      <span
        className={`text-sm ${
          done
            ? "text-stone-900"
            : active
            ? "text-stone-900 font-medium"
            : "text-stone-400"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

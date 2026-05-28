"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ProposalResponse,
  downloadProposalUrl,
  getProposal,
  regenerateProposalSection,
} from "@/lib/api";
import { useToast } from "@/lib/toast";
import { SiteNav } from "@/components/site-nav";
import { MarkdownView, extractOutline } from "@/components/markdown-view";
import { ColorTeamReviews } from "@/components/color-team-reviews";
import { WinThemesPanel } from "@/components/win-themes-panel";
import { ProposalGenerationProgress } from "@/components/proposal-generation-progress";

type Section = "strategy" | "executive" | "technical" | "financial";

const SECTION_META: Record<
  Section,
  { label: string; labelAr: string; icon: React.ReactNode }
> = {
  strategy: {
    label: "Strategy & Reviews",
    labelAr: "الإستراتيجية والمراجعات",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    ),
  },
  executive: {
    label: "Executive Summary",
    labelAr: "الملخص التنفيذي",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
  technical: {
    label: "Technical Proposal",
    labelAr: "العرض الفني",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    ),
  },
  financial: {
    label: "Financial Proposal",
    labelAr: "العرض المالي",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
};

function countWords(text: string | null): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function readingTime(words: number): string {
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
}

export default function ProposalPage() {
  const params = useParams();
  const id = params.id as string;

  const [proposal, setProposal] = useState<ProposalResponse | null>(null);
  const [activeSection, setActiveSection] = useState<Section>("strategy");
  const [activeLang, setActiveLang] = useState<"en" | "ar">("en");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function poll() {
      try {
        const data = await getProposal(id);
        if (cancelled) return;
        setProposal(data);
        if (data.status === "generating") {
          setTimeout(poll, 3000);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load proposal");
        }
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const activeContent = useMemo(() => {
    if (!proposal) return "";
    if (activeSection === "strategy") return "";
    const en = activeLang === "en";
    if (activeSection === "executive")
      return (en ? proposal.executive_summary_en : proposal.executive_summary_ar)
        || proposal.executive_summary || "";
    if (activeSection === "technical")
      return (en ? proposal.technical_proposal_en : proposal.technical_proposal_ar)
        || proposal.technical_proposal || "";
    return (en ? proposal.financial_proposal_en : proposal.financial_proposal_ar)
      || proposal.financial_proposal || "";
  }, [proposal, activeSection, activeLang]);

  const hasLanguage = (lang: "en" | "ar") => {
    if (!proposal) return false;
    if (activeSection === "executive")
      return !!(lang === "en" ? proposal.executive_summary_en : proposal.executive_summary_ar);
    if (activeSection === "technical")
      return !!(lang === "en" ? proposal.technical_proposal_en : proposal.technical_proposal_ar);
    if (activeSection === "financial")
      return !!(lang === "en" ? proposal.financial_proposal_en : proposal.financial_proposal_ar);
    return false;
  };

  const outline = useMemo(() => extractOutline(activeContent), [activeContent]);
  const wordCount = useMemo(() => countWords(activeContent), [activeContent]);

  if (error) {
    return (
      <main className="flex-1 bg-mesh">
        <SiteNav />
        <div className="max-w-md mx-auto text-center py-20">
          <h1 className="text-2xl font-bold text-stone-900 mb-2">Error</h1>
          <p className="text-stone-600 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors"
          >
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  if (!proposal) {
    return (
      <main className="flex-1 bg-mesh">
        <SiteNav />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full" />
        </div>
      </main>
    );
  }

  if (proposal.status === "generating") {
    return (
      <main className="flex-1 bg-mesh">
        <SiteNav />
        <ProposalGenerationProgress proposal={proposal} />
      </main>
    );
  }

  if (proposal.status === "error") {
    return (
      <main className="flex-1 bg-mesh">
        <SiteNav />
        <div className="max-w-md mx-auto text-center py-20">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-50 ring-1 ring-red-200/60 mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-stone-900 mb-2">
            Generation failed
          </h2>
          <p className="text-stone-600">{proposal.error_message}</p>
        </div>
      </main>
    );
  }

  const sectionsList: { id: Section; content: string | null }[] = [
    { id: "strategy", content: "strategy" },
    { id: "executive", content: proposal.executive_summary },
    { id: "technical", content: proposal.technical_proposal },
    { id: "financial", content: proposal.financial_proposal },
  ];

  const totalWords = sectionsList.reduce(
    (sum, s) => sum + countWords(s.content),
    0
  );

  return (
    <main className="flex-1 bg-mesh">
      <SiteNav />

      {/* Sticky header with download */}
      <header className="sticky top-[65px] z-10 bg-white/80 backdrop-blur-md border-b border-stone-200/60">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-700 to-emerald-900 flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-stone-900">
                Generated Proposal
              </div>
              <div className="text-xs text-stone-500 flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center gap-1">
                  <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  Ready
                </span>
                <span className="text-stone-300">·</span>
                <span>
                  {proposal.language === "bilingual"
                    ? "Bilingual"
                    : proposal.language === "ar"
                    ? "Arabic · عربي"
                    : "English"}
                </span>
                <span className="text-stone-300">·</span>
                <span>{totalWords.toLocaleString()} words</span>
              </div>
            </div>
          </div>

          <DownloadMenu proposalId={proposal.id} />
        </div>
      </header>

      {/* Document layout */}
      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
        {/* Sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-[180px] space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3 px-2">
                Sections
              </p>
              <nav className="space-y-1">
                {sectionsList.map((s) => {
                  const meta = SECTION_META[s.id];
                  const wc = countWords(s.content);
                  const isActive = activeSection === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setActiveSection(s.id)}
                      className={`w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition-all ${
                        isActive
                          ? "bg-emerald-50 ring-1 ring-emerald-200/60"
                          : "hover:bg-stone-100/60"
                      }`}
                    >
                      <div
                        className={`flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center ${
                          isActive
                            ? "bg-emerald-100"
                            : "bg-stone-100"
                        }`}
                      >
                        <svg
                          className={`w-3.5 h-3.5 ${
                            isActive ? "text-emerald-700" : "text-stone-500"
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          {meta.icon}
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-xs font-semibold leading-tight ${
                            isActive ? "text-emerald-900" : "text-stone-700"
                          }`}
                        >
                          {meta.label}
                        </div>
                        <div className="text-[10px] text-stone-400 mt-0.5 leading-tight" dir="rtl">
                          {meta.labelAr}
                        </div>
                        <div className="text-[10px] text-stone-400 mt-1 font-mono tabular-nums">
                          {wc} words · {readingTime(wc)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Outline */}
            {outline.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3 px-2">
                  In this section
                </p>
                <ul className="space-y-0.5 text-xs">
                  {outline.map((item, idx) => (
                    <li key={idx}>
                      <span
                        className={`block py-1.5 px-2 rounded text-stone-500 hover:text-stone-900 hover:bg-stone-100/60 cursor-pointer truncate ${
                          item.level === 3 ? "pl-6 text-[11px] text-stone-400" : ""
                        }`}
                      >
                        {item.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>

        {/* Document */}
        <div>
          {/* Mobile section selector */}
          <div className="lg:hidden flex gap-1.5 mb-5 overflow-x-auto pb-1">
            {sectionsList.map((s) => {
              const meta = SECTION_META[s.id];
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeSection === s.id
                      ? "bg-stone-900 text-white"
                      : "bg-white ring-1 ring-stone-200 text-stone-600"
                  }`}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>

          <article className="bg-white rounded-2xl ring-1 ring-stone-200/80 shadow-sm">
            {/* Section header */}
            <div className="px-8 md:px-12 pt-10 pb-6 border-b border-stone-100">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-2">
                    {activeSection === "executive"
                      ? "Section 1"
                      : activeSection === "technical"
                      ? "Section 2"
                      : "Section 3"}
                  </p>
                  <h1 className="text-3xl font-bold text-stone-900 tracking-tight">
                    {SECTION_META[activeSection].label}
                  </h1>
                  <p
                    className="text-base text-stone-500 mt-1"
                    dir="rtl"
                  >
                    {SECTION_META[activeSection].labelAr}
                  </p>
                </div>
                {activeSection !== "strategy" && (
                  <div className="flex items-center gap-2">
                    {/* Language toggle */}
                    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 ring-1 ring-stone-200 dark:ring-stone-700">
                      <button
                        onClick={() => setActiveLang("en")}
                        disabled={!hasLanguage("en")}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                          activeLang === "en"
                            ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm"
                            : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                        }`}
                      >
                        English
                      </button>
                      <button
                        onClick={() => setActiveLang("ar")}
                        disabled={!hasLanguage("ar")}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                          activeLang === "ar"
                            ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm"
                            : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                        }`}
                        dir="rtl"
                      >
                        العربية
                      </button>
                    </div>
                    <RegenerateButton
                      proposalId={proposal.id}
                      section={activeSection as "executive" | "technical" | "financial"}
                      onStarted={() => setProposal((p) => p ? { ...p, status: "generating" } : p)}
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 mt-4 text-xs text-stone-400">
                <span>{wordCount.toLocaleString()} words</span>
                <span>·</span>
                <span>{readingTime(wordCount)}</span>
                {proposal.completed_at && (
                  <>
                    <span>·</span>
                    <span>
                      Generated{" "}
                      {new Date(proposal.completed_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Section body */}
            <div className="px-8 md:px-12 py-8 md:py-10">
              {activeSection === "strategy" ? (
                <div className="space-y-10">
                  <WinThemesPanel proposalId={proposal.id} />
                  <div className="border-t border-stone-100 dark:border-stone-800 pt-10">
                    <ColorTeamReviews proposalId={proposal.id} />
                  </div>
                </div>
              ) : (
                <div dir={activeLang === "ar" ? "rtl" : "ltr"} className={activeLang === "ar" ? "text-right" : ""}>
                  <MarkdownView content={activeContent || ""} />
                </div>
              )}
            </div>

            {/* Section footer with nav */}
            <div className="px-8 md:px-12 py-5 border-t border-stone-100 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/30 rounded-b-2xl flex items-center justify-between">
              <PrevButton
                activeSection={activeSection}
                onChange={setActiveSection}
              />
              <NextButton
                activeSection={activeSection}
                onChange={setActiveSection}
              />
            </div>
          </article>
        </div>
      </div>
    </main>
  );
}

function PrevButton({
  activeSection,
  onChange,
}: {
  activeSection: Section;
  onChange: (s: Section) => void;
}) {
  const map: Record<Section, Section | null> = {
    strategy: null,
    executive: "strategy",
    technical: "executive",
    financial: "technical",
  };
  const prev = map[activeSection];
  if (!prev) return <div />;

  return (
    <button
      onClick={() => onChange(prev)}
      className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-emerald-700 font-medium transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      <div className="text-left">
        <div className="text-[10px] uppercase tracking-wider text-stone-400 leading-tight">
          Previous
        </div>
        <div>{SECTION_META[prev].label}</div>
      </div>
    </button>
  );
}

function NextButton({
  activeSection,
  onChange,
}: {
  activeSection: Section;
  onChange: (s: Section) => void;
}) {
  const map: Record<Section, Section | null> = {
    strategy: "executive",
    executive: "technical",
    technical: "financial",
    financial: null,
  };
  const next = map[activeSection];
  if (!next) return <div />;

  return (
    <button
      onClick={() => onChange(next)}
      className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-emerald-700 font-medium transition-colors"
    >
      <div className="text-right">
        <div className="text-[10px] uppercase tracking-wider text-stone-400 leading-tight">
          Next
        </div>
        <div>{SECTION_META[next].label}</div>
      </div>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
      </svg>
    </button>
  );
}

function DownloadMenu({ proposalId }: { proposalId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-semibold hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors shadow-elev-2"
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
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        Download
        <svg
          className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-20 w-72 bg-white dark:bg-stone-900 rounded-xl ring-1 ring-stone-200 dark:ring-stone-800 shadow-elev-4 overflow-hidden animate-fade-in-down origin-top-right">
            <div className="px-4 py-2.5 border-b border-stone-100 dark:border-stone-800">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                English version
              </p>
            </div>
            <a
              href={downloadProposalUrl(proposalId, "docx", "en")}
              className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
              onClick={() => setOpen(false)}
            >
              <div className="w-7 h-7 rounded bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-blue-700 dark:text-blue-300" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">Word (.docx)</p>
                <p className="text-[10px] text-stone-500 dark:text-stone-400">Editable</p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">EN</span>
            </a>
            <a
              href={downloadProposalUrl(proposalId, "pdf", "en")}
              className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors border-b border-stone-100 dark:border-stone-800"
              onClick={() => setOpen(false)}
            >
              <div className="w-7 h-7 rounded bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-red-700 dark:text-red-300" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">PDF</p>
                <p className="text-[10px] text-stone-500 dark:text-stone-400">Final form</p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">EN</span>
            </a>

            <div className="px-4 py-2.5 border-b border-stone-100 dark:border-stone-800 bg-stone-50/40 dark:bg-stone-800/30">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                النسخة العربية · Arabic version
              </p>
            </div>
            <a
              href={downloadProposalUrl(proposalId, "docx", "ar")}
              className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
              onClick={() => setOpen(false)}
            >
              <div className="w-7 h-7 rounded bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-blue-700 dark:text-blue-300" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">Word (.docx)</p>
                <p className="text-[10px] text-stone-500 dark:text-stone-400">قابل للتحرير</p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">AR</span>
            </a>
            <a
              href={downloadProposalUrl(proposalId, "pdf", "ar")}
              className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
              onClick={() => setOpen(false)}
            >
              <div className="w-7 h-7 rounded bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-red-700 dark:text-red-300" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">PDF</p>
                <p className="text-[10px] text-stone-500 dark:text-stone-400">النسخة النهائية</p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">AR</span>
            </a>
          </div>
        </>
      )}
    </div>
  );
}

function RegenerateButton({
  proposalId,
  section,
  onStarted,
}: {
  proposalId: string;
  section: "executive" | "technical" | "financial";
  onStarted: () => void;
}) {
  const { show } = useToast();
  const [busy, setBusy] = useState(false);

  const handle = async () => {
    if (!confirm(`Regenerate the ${section} section? The current content will be replaced.`)) return;
    setBusy(true);
    try {
      await regenerateProposalSection(proposalId, section);
      onStarted();
      show({
        variant: "info",
        title: "Regenerating",
        message: `Rewriting the ${section} section — this takes ~20-30 seconds.`,
      });
    } catch (err) {
      show({
        variant: "error",
        message: err instanceof Error ? err.message : "Failed to start regeneration",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={handle}
      disabled={busy}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white ring-1 ring-stone-200 text-xs font-medium text-stone-700 hover:ring-emerald-300 hover:text-emerald-700 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
    >
      {busy ? (
        <div className="animate-spin h-3.5 w-3.5 border-2 border-emerald-600 border-t-transparent rounded-full" />
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )}
      Regenerate
    </button>
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
        {active && <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />}
      </div>
      <span
        className={`text-sm ${
          done ? "text-stone-900" : active ? "text-stone-900 font-medium" : "text-stone-400"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

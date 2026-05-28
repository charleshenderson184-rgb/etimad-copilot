"use client";

import Link from "next/link";
import { FloatingOrbs } from "@/components/floating-orbs";

export function AuthShell({
  title,
  titleAr,
  subtitle,
  children,
  footer,
}: {
  title: string;
  titleAr: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-stone-50">
      {/* Brand panel */}
      <aside className="relative hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-emerald-800 via-emerald-900 to-stone-900 overflow-hidden">
        <FloatingOrbs />
        <div className="absolute inset-0 opacity-10 bg-grid" />

        <Link href="/" className="relative flex items-center gap-2.5 group z-10">
          <div className="w-9 h-9 rounded-lg bg-white/10 ring-1 ring-white/20 backdrop-blur flex items-center justify-center">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="text-white">
            <div className="text-sm font-semibold leading-tight">
              Etimad Copilot
            </div>
            <div className="text-xs text-emerald-200/70 leading-tight" dir="rtl">
              مساعد المنافسات
            </div>
          </div>
        </Link>

        <div className="relative z-10 max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300 mb-3">
            Trusted by KSA SMEs
          </p>
          <blockquote className="text-2xl font-bold text-white leading-snug tracking-tight mb-6">
            &ldquo;We went from 2 hours per page to 30 minutes for a complete
            compliance review. We&apos;ve already submitted 3 winning bids.&rdquo;
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-300 to-emerald-500 flex items-center justify-center text-white font-bold text-sm">
              MA
            </div>
            <div>
              <div className="text-sm font-medium text-white">
                Mohammed Al-Harbi
              </div>
              <div className="text-xs text-emerald-200/70">
                CEO, Tadawul Tech · Riyadh
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-4 text-white">
          <div>
            <div className="text-2xl font-bold">3,200+</div>
            <div className="text-xs text-emerald-200/70">Tenders processed</div>
          </div>
          <div>
            <div className="text-2xl font-bold">47%</div>
            <div className="text-xs text-emerald-200/70">Higher win-rate</div>
          </div>
          <div>
            <div className="text-2xl font-bold">SAR 142M</div>
            <div className="text-xs text-emerald-200/70">Bids submitted</div>
          </div>
        </div>
      </aside>

      {/* Form panel */}
      <section className="flex flex-col">
        <div className="px-6 lg:px-12 py-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900 transition-colors"
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
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to home
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 lg:px-12 pb-12">
          <div className="w-full max-w-md animate-fade-in-up">
            <h1 className="text-3xl font-bold text-stone-900 tracking-tight mb-1">
              {title}
            </h1>
            <p className="text-sm text-stone-400 mb-2" dir="rtl">
              {titleAr}
            </p>
            <p className="text-stone-600 mb-8">{subtitle}</p>

            {children}

            {footer && (
              <div className="mt-6 pt-6 border-t border-stone-100 text-center text-sm text-stone-500">
                {footer}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

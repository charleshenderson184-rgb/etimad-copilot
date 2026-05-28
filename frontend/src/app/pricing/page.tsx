"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteNav } from "@/components/site-nav";
import { Reveal } from "@/components/reveal";
import { PLANS, PlanTier, useAuth } from "@/lib/auth";

const TIERS: { id: PlanTier; popular?: boolean; cta: string }[] = [
  { id: "starter", cta: "Start with Starter" },
  { id: "growth", popular: true, cta: "Choose Growth" },
  { id: "enterprise", cta: "Talk to sales" },
];

export default function PricingPage() {
  const router = useRouter();
  const { user, updatePlan } = useAuth();
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const [busyPlan, setBusyPlan] = useState<PlanTier | null>(null);

  const handleChoose = async (plan: PlanTier) => {
    if (!user) {
      router.push("/signup");
      return;
    }
    if (plan === "trial") {
      router.push("/account");
      return;
    }
    setBusyPlan(plan);
    try {
      // Try real Stripe checkout. If billing is disabled server-side, the API
      // returns a dev_mode=true response and we just flip the plan locally.
      const { createCheckoutSession } = await import("@/lib/api");
      const { url, dev_mode } = await createCheckoutSession(
        plan as "starter" | "growth" | "enterprise"
      );
      if (dev_mode) {
        updatePlan(plan);
      }
      window.location.href = url;
    } catch (err) {
      console.error("Checkout failed:", err);
      // Fallback to dev behaviour
      updatePlan(plan);
      router.push("/account?upgraded=1");
    } finally {
      setBusyPlan(null);
    }
  };

  return (
    <main className="flex-1 relative">
      <SiteNav />

      {/* Hero */}
      <section className="relative px-6 pt-16 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-mesh" />
        <div className="absolute inset-0 bg-grid" />

        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-white/80 backdrop-blur ring-1 ring-stone-200 text-xs text-stone-600 shadow-sm animate-fade-in-down">
            <span className="text-emerald-600">SAR</span>
            <span className="text-stone-400">·</span>
            Transparent pricing
            <span className="mx-1 text-stone-300">·</span>
            <span dir="rtl">أسعار شفافة</span>
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-stone-900 mb-5 leading-[1.05] animate-fade-in-up delay-100">
            One winning tender
            <br />
            <span className="text-gradient-animated">pays for years.</span>
          </h1>

          <p className="text-lg text-stone-600 max-w-xl mx-auto leading-relaxed animate-fade-in-up delay-200">
            Plans scaled to your bidding velocity. All prices in Saudi Riyal,
            VAT excluded. Cancel anytime.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center gap-2 p-1 rounded-xl bg-white ring-1 ring-stone-200 shadow-sm animate-fade-in-up delay-300">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                billing === "monthly"
                  ? "bg-stone-900 text-white shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                billing === "annual"
                  ? "bg-stone-900 text-white shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Annual
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  billing === "annual"
                    ? "bg-emerald-400/30 text-emerald-100"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                −20%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="px-6 pb-16">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
          {TIERS.map((tier, idx) => {
            const plan = PLANS[tier.id];
            const monthly = plan.priceSar ?? 0;
            const annual = Math.round(monthly * 12 * 0.8);
            const displayPrice =
              billing === "monthly" ? monthly : Math.round(annual / 12);
            const isCurrent = user?.plan === tier.id;

            return (
              <Reveal key={tier.id} delay={idx * 100}>
                <div
                  className={`relative bg-white rounded-3xl ring-1 transition-all duration-500 h-full flex flex-col ${
                    tier.popular
                      ? "ring-emerald-300 shadow-xl shadow-emerald-100/50 lg:scale-105 lg:-mt-2"
                      : "ring-stone-200 hover:ring-stone-300 hover:shadow-lg"
                  }`}
                >
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <div className="px-3 py-1 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-xs font-semibold shadow-md">
                        ★ Most Popular
                      </div>
                    </div>
                  )}

                  <div className="p-7 border-b border-stone-100">
                    <h3 className="text-lg font-bold text-stone-900">
                      {plan.label}
                    </h3>
                    <p className="text-xs text-stone-400 mt-0.5" dir="rtl">
                      {plan.labelAr}
                    </p>
                    <p className="text-sm text-stone-600 mt-2 leading-relaxed min-h-[40px]">
                      {plan.description}
                    </p>

                    <div className="mt-5">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs font-semibold text-stone-500">
                          SAR
                        </span>
                        <span className="text-5xl font-bold text-stone-900 tracking-tight">
                          {displayPrice.toLocaleString()}
                        </span>
                        <span className="text-sm text-stone-500">/ mo</span>
                      </div>
                      {billing === "annual" && (
                        <p className="text-xs text-emerald-700 mt-1.5">
                          Billed annually · SAR {annual.toLocaleString()}/yr
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleChoose(tier.id)}
                      disabled={isCurrent}
                      className={`mt-6 w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                        isCurrent
                          ? "bg-stone-100 text-stone-500 cursor-not-allowed"
                          : tier.popular
                          ? "bg-gradient-to-r from-emerald-700 to-emerald-900 text-white hover:shadow-lg hover:from-emerald-600 hover:to-emerald-800"
                          : "bg-stone-900 text-white hover:bg-stone-800"
                      }`}
                    >
                      {isCurrent ? "Current plan" : tier.cta}
                    </button>
                  </div>

                  <div className="p-7 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-4">
                      What&apos;s included
                    </p>
                    <ul className="space-y-3">
                      {plan.features.map((feat, j) => (
                        <li key={j} className="flex items-start gap-2.5 text-sm">
                          <div
                            className={`flex-shrink-0 w-4 h-4 mt-0.5 rounded-full flex items-center justify-center ${
                              tier.popular
                                ? "bg-emerald-600"
                                : "bg-emerald-100"
                            }`}
                          >
                            <svg
                              className={`w-2.5 h-2.5 ${
                                tier.popular ? "text-white" : "text-emerald-700"
                              }`}
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
                          </div>
                          <span className="text-stone-700 leading-relaxed">
                            {feat}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Success fee callout */}
      <section className="px-6 pb-16">
        <Reveal>
          <div className="max-w-4xl mx-auto bg-white rounded-3xl ring-1 ring-stone-200 p-8 md:p-10 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-2">
                Aligned incentives
              </p>
              <h3 className="text-2xl font-bold text-stone-900 mb-2 tracking-tight">
                We only profit when you win.
              </h3>
              <p className="text-stone-600 leading-relaxed">
                Growth and Enterprise plans include a modest success fee on
                won tenders (1% and 0.5% respectively, capped). If we don&apos;t
                help you win, you don&apos;t pay it.
              </p>
            </div>
            <div className="text-center md:text-right">
              <div className="text-4xl font-bold text-gradient">1%</div>
              <div className="text-xs text-stone-500 mt-1">
                of won tender value
              </div>
              <div className="text-xs text-stone-400 mt-0.5">
                (capped at SAR 50K)
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* FAQ */}
      <section className="px-6 pb-24">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <h2 className="text-2xl font-bold text-stone-900 mb-8 text-center tracking-tight">
              Frequently asked questions
            </h2>
          </Reveal>

          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <Reveal key={i} delay={i * 60}>
                <details className="group bg-white rounded-xl ring-1 ring-stone-200/80 overflow-hidden">
                  <summary className="cursor-pointer p-5 flex items-center justify-between hover:bg-stone-50/60 transition-colors">
                    <span className="font-medium text-stone-900">
                      {faq.q}
                    </span>
                    <svg
                      className="w-4 h-4 text-stone-400 transition-transform group-open:rotate-180"
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
                  </summary>
                  <div className="px-5 pb-5 text-stone-600 text-sm leading-relaxed">
                    {faq.a}
                  </div>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-24">
        <Reveal>
          <div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-emerald-800 via-emerald-900 to-stone-900 rounded-3xl p-12 relative overflow-hidden shadow-xl">
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full border border-emerald-700/40 animate-rotate-slow" />
            <div
              className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full border border-emerald-700/30 animate-rotate-slow"
              style={{ animationDirection: "reverse" }}
            />
            <div className="relative">
              <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">
                Not sure which plan?
              </h2>
              <p className="text-emerald-100/70 mb-6">
                Start with the free trial. No card needed.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-stone-900 text-sm font-semibold hover:scale-105 transition-transform shadow-lg"
              >
                Start your 14-day trial
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
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </main>
  );
}

const FAQS = [
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your account at any time. For annual plans, we refund the unused portion on a prorated basis.",
  },
  {
    q: "What counts as an 'RFP analysis'?",
    a: "Each unique tender PDF you upload counts as one analysis. Re-running analysis on the same RFP does not consume an additional credit.",
  },
  {
    q: "How is the success fee calculated?",
    a: "On Growth and Enterprise plans, a small percentage of the contract value is invoiced if you win a tender that was drafted on the platform. You self-report wins; we trust you.",
  },
  {
    q: "Do you offer team plans?",
    a: "Growth includes up to 5 seats; Enterprise is unlimited. All seats get role-based access (viewer / editor / admin / owner), inline @-mentions on every requirement and proposal section, and a full audit trail.",
  },
  {
    q: "What languages are supported?",
    a: "RFP analysis works on Arabic, English, or mixed documents. Proposal generation produces two separate documents — one fully in English, one fully in Arabic — both formatted natively (RTL for Arabic).",
  },
  {
    q: "Can teammates work on the same tender at the same time?",
    a: "Yes. Comments, @-mentions and status updates are real-time-ish (polled every 30 seconds). The notification bell in the nav surfaces mentions and an activity log lives next to every tender.",
  },
  {
    q: "What about VAT?",
    a: "All listed prices exclude 15% VAT. We issue tax-compliant invoices with your CR and VAT number.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. All RFPs and proposals are encrypted at rest. Data residency in KSA is available on Enterprise. PDPL-compliant by default — full details on our security page.",
  },
  {
    q: "Do you store our knowledge base on a vendor's model?",
    a: "No. Your company documents are stored in your private workspace and used only to personalise your own proposals. We don't train on customer data.",
  },
  {
    q: "Can I export to Word for offline editing?",
    a: "Every generated proposal exports to .docx so reviewers can red-line offline. PDF export is in beta — most teams use Word for the final pass and print-to-PDF themselves.",
  },
  {
    q: "What happens if I run out of credits mid-month?",
    a: "We notify you at 80% and 100% usage. You can upgrade with a single click — Stripe Checkout — and credits top up immediately, prorated against the cycle.",
  },
  {
    q: "Can we get SSO and a custom DPA?",
    a: "Both included on Enterprise. We also support data residency in KSA, custom SLAs, and dedicated onboarding. Reach out — we'll usually turn around a redlined DPA in 5 business days.",
  },
];

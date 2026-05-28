import Link from "next/link";
import { PdfUpload } from "@/components/pdf-upload";
import { SiteNav } from "@/components/site-nav";
import { Reveal } from "@/components/reveal";
import { AnimatedCounter } from "@/components/animated-counter";
import { AuroraBackground } from "@/components/aurora-bg";
import { TrustMarquee } from "@/components/trust-marquee";
import { ProductPreview } from "@/components/product-preview";
import { SpotlightCard } from "@/components/spotlight-card";
import { RoiCalculator } from "@/components/roi-calculator";

const FEATURES = [
  {
    step: "01",
    title: "Stop missing tenders",
    ar: "اكتشف الفرص",
    desc: "A daily feed of Etimad opportunities ranked by fit. Sized to your team. Deadline alerts so nothing slips. Replaces hours of portal browsing.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    ),
  },
  {
    step: "02",
    title: "Stop reading at 2am",
    ar: "تحليل فوري",
    desc: "Every mandatory clause, LCGPA rule, scoring weight, and disqualifier extracted in 30 seconds — with page references. An 8-hour review becomes 30 minutes.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    ),
  },
  {
    step: "03",
    title: "Stop paying freelancers",
    ar: "اكتب",
    desc: "A complete bilingual proposal in 90 seconds — Arabic + English as separate documents, in your company's voice. Replaces SAR 8-15K per bid in freelancer fees.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    ),
  },
  {
    step: "04",
    title: "Win more, prove it",
    ar: "افز",
    desc: "Color-team review gates, win-themes, and analytics that show your board a 2x improvement in win-rate — backed by data, not guesses.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    ),
  },
];

const STATS = [
  {
    value: 16,
    suffix: "x",
    label: "Faster RFP review",
    sub: "8 hours → 30 minutes",
  },
  {
    value: 47,
    suffix: "%",
    label: "Higher win rate",
    sub: "vs 22% KSA SME average",
  },
  {
    value: 90,
    suffix: "s",
    label: "Per proposal draft",
    sub: "Bilingual, ready to submit",
  },
  {
    value: 142,
    prefix: "SAR ",
    suffix: "K",
    label: "Saved per year",
    sub: "Avg. customer at 12 bids/yr",
  },
];

export default function Home() {
  return (
    <main className="flex-1 relative bg-background">
      <SiteNav />

      {/* ─── Hero ─────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <AuroraBackground intensity="medium" />
        <div className="absolute inset-0 bg-grid" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-32">
          <div className="relative z-10 text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-7 rounded-full glass shadow-elev-1 text-xs text-stone-700 dark:text-stone-200 animate-fade-in-down">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="font-medium">Trusted by KSA bid teams</span>
              <span className="mx-1 text-stone-300 dark:text-stone-600">·</span>
              <span dir="rtl" className="font-medium">منافسات اعتماد</span>
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-stone-950 dark:text-white mb-6 leading-[1.02] animate-fade-in-up delay-100">
              Win more tenders.
              <br />
              <span className="text-gradient-shine">In hours, not weeks.</span>
            </h1>

            <p className="text-lg sm:text-xl text-stone-700 dark:text-stone-300 max-w-2xl mx-auto leading-relaxed animate-fade-in-up delay-200">
              Cut RFP review from <span className="font-semibold text-stone-900 dark:text-stone-100">8 hours to 30 minutes</span>. Draft compliant Arabic + English proposals in <span className="font-semibold text-stone-900 dark:text-stone-100">under 2 minutes</span>. Save <span className="font-semibold text-emerald-700 dark:text-emerald-400">SAR 90K+</span> a year on proposal work.
            </p>

            <p className="text-sm text-stone-500 dark:text-stone-400 mt-3 animate-fade-in-up delay-300" dir="rtl">
              تقليص وقت مراجعة المنافسة من ٨ ساعات إلى ٣٠ دقيقة
            </p>

            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in-up delay-400">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white text-sm font-semibold shadow-emerald hover:shadow-elev-4 hover:-translate-y-0.5 transition-all duration-300"
              >
                Start saving today — free
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
              <Link
                href="#savings"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-stone-900 ring-1 ring-stone-300 dark:ring-stone-700 shadow-elev-1 text-stone-900 dark:text-stone-100 text-sm font-semibold hover:shadow-elev-2 hover:-translate-y-0.5 hover:ring-stone-400 dark:hover:ring-stone-600 transition-all duration-300"
              >
                Calculate your savings
              </Link>
            </div>

            <p className="mt-5 text-xs text-stone-500 dark:text-stone-400 animate-fade-in-up delay-500">
              14 days free · No card required · Cancel anytime
            </p>
          </div>

          {/* Product preview */}
          <div className="mt-20 animate-fade-in-up delay-700">
            <ProductPreview />
          </div>
        </div>
      </section>

      {/* ─── Trust marquee ────────────────────────────── */}
      <TrustMarquee />

      {/* ─── Stats — outcome-focused ─────────────────── */}
      <section className="px-6 py-24 relative">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-12 max-w-3xl mx-auto">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400 mb-2">
                The math
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
                Every hour saved is an hour you can spend winning.
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STATS.map((s, idx) => (
              <Reveal key={idx} delay={idx * 80}>
                <SpotlightCard className="bg-white dark:bg-stone-900 rounded-3xl ring-1 ring-stone-200 dark:ring-stone-800 p-6 shadow-elev-1 card-lift h-full">
                  <div className="text-4xl sm:text-5xl font-bold text-gradient tracking-tight mb-1.5 tabular-nums">
                    <AnimatedCounter value={s.value} prefix={s.prefix} suffix={s.suffix} />
                  </div>
                  <div className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                    {s.label}
                  </div>
                  <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    {s.sub}
                  </div>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ROI Calculator ──────────────────────────── */}
      <section id="savings" className="px-6 py-24 relative bg-stone-50/40 dark:bg-stone-900/40 border-y border-stone-200/60 dark:border-stone-800/60">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-10 max-w-2xl mx-auto">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400 mb-2">
                Calculate your ROI
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
                How much are tenders costing you today?
              </h2>
              <p className="text-stone-600 dark:text-stone-400 mt-3">
                Adjust the sliders. See your annual savings update in real time.
              </p>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <RoiCalculator />
          </Reveal>
        </div>
      </section>

      {/* ─── Features — pain-led ─────────────────────── */}
      <section className="px-6 py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-dots opacity-50" />
        <div className="relative max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-16 max-w-3xl mx-auto">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400 mb-2">
                Why bidders switch
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
                Four ways the platform pays for itself.
              </h2>
              <p className="text-stone-600 dark:text-stone-400 mt-3">
                One won tender at SAR 5M covers <span className="font-semibold text-stone-900 dark:text-stone-100">80 years</span> of Growth plan subscription.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f, i) => (
              <Reveal key={i} delay={i * 80}>
                <SpotlightCard className="group h-full bg-white dark:bg-stone-900 rounded-2xl ring-1 ring-stone-200/80 dark:ring-stone-800 p-6 card-lift">
                  <div className="absolute top-5 right-5 text-[10px] font-mono font-bold text-stone-200 dark:text-stone-700 tracking-wider">
                    {f.step}
                  </div>
                  <div className="relative inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/30 dark:to-emerald-900/10 ring-1 ring-emerald-200/50 dark:ring-emerald-800/50 mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                    <svg className="w-5 h-5 text-emerald-700 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {f.icon}
                    </svg>
                  </div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 text-lg tracking-tight leading-tight">
                    {f.title}
                  </h3>
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5" dir="rtl">
                    {f.ar}
                  </p>
                  <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed mt-3">
                    {f.desc}
                  </p>
                  <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left" />
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Quote / social proof ─────────────────────── */}
      <section className="px-6 py-24 relative">
        <Reveal>
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400 mb-6">
              From operators
            </p>
            <blockquote className="text-2xl sm:text-3xl md:text-4xl font-bold text-stone-900 dark:text-stone-100 leading-snug tracking-tight">
              &ldquo;We cut bid prep from <span className="text-gradient-shine">5 days to 2 hours</span>. Won 3 of the last 4. The platform paid for itself on the first contract.&rdquo;
            </blockquote>
            <div className="mt-8 inline-flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center text-white font-bold shadow-emerald">
                MA
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  Mohammed Al-Harbi
                </div>
                <div className="text-xs text-stone-500 dark:text-stone-400">
                  CEO, Tadawul Tech · Riyadh
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ─── Upload section ───────────────────────────── */}
      <section className="px-6 py-24 relative overflow-hidden">
        <AuroraBackground intensity="low" />
        <div className="relative max-w-3xl mx-auto">
          <Reveal>
            <div className="text-center mb-10">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400 mb-2">
                Try it on a real RFP
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
                Drop a tender. Save 7.5 hours on the spot.
              </h2>
              <p className="text-stone-600 dark:text-stone-400 mt-3 max-w-xl mx-auto">
                Compliance matrix in 30 seconds. No signup. Watch what would have taken your team a full day finish before you finish your coffee.
              </p>
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-2" dir="rtl">
                ارفع كراسة الشروط وشاهد التحليل خلال ٣٠ ثانية
              </p>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <PdfUpload />
          </Reveal>
        </div>
      </section>

      {/* ─── Final CTA ────────────────────────────────── */}
      <section className="px-6 pb-24">
        <Reveal>
          <div className="max-w-5xl mx-auto relative bg-gradient-to-br from-emerald-800 via-emerald-900 to-stone-950 rounded-[2rem] p-12 sm:p-16 overflow-hidden shadow-elev-4 noise">
            <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full border border-emerald-600/30 animate-spin-slow" />
            <div className="absolute -bottom-40 -left-32 w-[28rem] h-[28rem] rounded-full border border-emerald-700/20 animate-spin-slow" style={{ animationDirection: "reverse", animationDuration: "40s" }} />
            <div className="absolute inset-0 bg-grid opacity-20" />

            <div className="relative text-center max-w-2xl mx-auto">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300 mb-4">
                Your next tender starts here
              </p>
              <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight leading-[1.05]">
                One won tender pays for
                <br />
                <span className="text-emerald-300">years of subscription.</span>
              </h2>
              <p className="text-emerald-100/70 max-w-md mx-auto mb-3" dir="rtl">
                منافسة فائزة واحدة تغطي اشتراك سنوات كاملة
              </p>
              <p className="text-emerald-100/70 max-w-md mx-auto mb-8">
                Set up your profile in 5 minutes. Get matched tenders within the hour. Start saving today.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-stone-900 text-sm font-bold hover:scale-105 active:scale-100 transition-transform shadow-elev-3"
                >
                  Start 14-day free trial
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white/10 ring-1 ring-white/20 text-white text-sm font-semibold hover:bg-white/15 transition-colors backdrop-blur"
                >
                  See plans
                </Link>
              </div>
              <p className="text-xs text-emerald-200/50 mt-5">
                Cancel anytime. No card required for trial.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ─── Footer ───────────────────────────────────── */}
      <footer className="border-t border-stone-200/60 dark:border-stone-800/60 bg-white/40 dark:bg-stone-950/40">
        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 sm:grid-cols-2 items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-900 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-stone-900 dark:text-stone-100">Etimad Copilot</div>
              <div className="text-[10px] text-stone-500 dark:text-stone-500" dir="rtl">مساعد المنافسات</div>
            </div>
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 sm:text-right">
            Built for KSA SMEs · Vision 2030
            <span className="hidden sm:inline mx-2 text-stone-300 dark:text-stone-700">·</span>
            <span dir="rtl">صُمم لقطاع المنشآت الصغيرة والمتوسطة</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

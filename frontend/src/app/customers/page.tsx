import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { Reveal } from "@/components/reveal";

export const metadata = {
  title: "Customers — Etimad Copilot",
  description:
    "How mid-market consultancies and contractors use Etimad Copilot to bid more tenders, faster.",
};

export default function CustomersPage() {
  return (
    <main className="flex-1 bg-mesh dark:bg-stone-950 min-h-screen">
      <SiteNav />

      {/* Hero */}
      <section className="px-6 pt-16 pb-12">
        <div className="max-w-4xl mx-auto text-center">
          <Reveal>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400 mb-4">
              Customers
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-stone-950 dark:text-stone-50">
              Bid teams that ship more,
              <br />
              <span className="text-emerald-700 dark:text-emerald-400">
                without growing the team.
              </span>
            </h1>
            <p className="mt-5 text-stone-600 dark:text-stone-400 text-lg max-w-2xl mx-auto">
              Real numbers from real bid managers. Mid-market consultancies, contractors, and government suppliers turning tender response from a 2-week sprint into a 2-day pass.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Stats strip */}
      <section className="px-6 pb-16">
        <div className="max-w-5xl mx-auto rounded-3xl bg-stone-900 dark:bg-stone-800 text-white grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-stone-700">
          {STATS.map((s) => (
            <div key={s.label} className="px-8 py-8 text-center">
              <div className="text-4xl md:text-5xl font-bold tracking-tight text-emerald-400">
                {s.value}
              </div>
              <div className="mt-2 text-xs uppercase tracking-[0.15em] text-stone-300">
                {s.label}
              </div>
              <div className="mt-2 text-xs text-stone-400">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Case studies */}
      <section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <h2 className="text-2xl md:text-3xl font-bold text-center text-stone-950 dark:text-stone-50">
              How they do it
            </h2>
            <p className="mt-2 text-center text-stone-600 dark:text-stone-400 text-sm">
              Three patterns we see across winning teams.
            </p>
          </Reveal>

          <div className="mt-10 grid lg:grid-cols-3 gap-6">
            {STUDIES.map((s) => (
              <Reveal key={s.company}>
                <article className="h-full rounded-2xl bg-white dark:bg-stone-900 ring-1 ring-stone-200 dark:ring-stone-800 overflow-hidden flex flex-col">
                  <div
                    className={`h-32 ${s.gradient} flex items-end px-6 pb-5`}
                  >
                    <div>
                      <div className="text-xs uppercase tracking-[0.15em] text-white/80 font-semibold">
                        {s.industry}
                      </div>
                      <div className="text-xl font-bold text-white mt-1">
                        {s.company}
                      </div>
                    </div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <blockquote className="text-stone-800 dark:text-stone-200 text-sm leading-relaxed italic flex-1">
                      “{s.quote}”
                    </blockquote>
                    <footer className="mt-4 pt-4 border-t border-stone-100 dark:border-stone-800">
                      <div className="text-sm font-semibold text-stone-950 dark:text-stone-50">
                        {s.author}
                      </div>
                      <div className="text-xs text-stone-500">{s.role}</div>
                    </footer>
                    <dl className="mt-5 grid grid-cols-2 gap-3">
                      {s.metrics.map((m) => (
                        <div
                          key={m.label}
                          className="rounded-lg bg-stone-50 dark:bg-stone-800/50 px-3 py-2"
                        >
                          <dd className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                            {m.value}
                          </dd>
                          <dt className="text-[10px] uppercase tracking-wider text-stone-500 mt-0.5">
                            {m.label}
                          </dt>
                        </div>
                      ))}
                    </dl>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Logos placeholder */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500 font-semibold">
            Used by bid teams at
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {LOGOS.map((name) => (
              <span
                key={name}
                className="text-stone-400 dark:text-stone-600 font-semibold text-lg tracking-tight"
              >
                {name}
              </span>
            ))}
          </div>
          <p className="mt-6 text-xs text-stone-500 italic">
            Anonymized at customer request. Real names available on Enterprise sales calls.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-24">
        <div className="max-w-3xl mx-auto rounded-3xl bg-stone-900 dark:bg-stone-800 text-white p-10 text-center">
          <h2 className="text-2xl font-bold">Become a case study.</h2>
          <p className="mt-3 text-stone-300 text-sm max-w-md mx-auto">
            We work directly with new accounts for the first 30 days. Win your first tender on the platform and we'll share the playbook with the next 100 customers.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-lg bg-white text-stone-950 font-medium text-sm px-5 py-2.5 hover:bg-stone-100"
            >
              Start free trial
            </Link>
            <Link
              href="/pricing"
              className="rounded-lg ring-1 ring-stone-600 text-white text-sm font-medium px-5 py-2.5 hover:ring-stone-400"
            >
              See pricing
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

const STATS = [
  {
    value: "8h → 30m",
    label: "RFP review time",
    sub: "From compliance matrix to first draft",
  },
  {
    value: "3.4×",
    label: "more tenders bid",
    sub: "Same headcount, same quality bar",
  },
  {
    value: "23%",
    label: "lift in win rate",
    sub: "Color-team reviews + win themes baked in",
  },
];

const STUDIES = [
  {
    company: "Mid-market IT consultancy",
    industry: "Technology",
    gradient: "bg-gradient-to-br from-emerald-600 to-teal-700",
    quote:
      "We used to no-bid two out of three tenders because the team couldn't physically read all the docs in time. Now we triage every single one in the first hour. We're winning contracts we'd have walked away from.",
    author: "Bid Manager",
    role: "150-person consultancy, Riyadh",
    metrics: [
      { label: "Tenders bid / month", value: "12 → 38" },
      { label: "Avg. review time", value: "−85%" },
    ],
  },
  {
    company: "MEP contractor",
    industry: "Engineering",
    gradient: "bg-gradient-to-br from-indigo-600 to-violet-700",
    quote:
      "The bilingual proposals are the killer feature. Our Arabic-first reviewers and our English-speaking PMs are working from the same source of truth — but with documents they actually want to read.",
    author: "Commercial Director",
    role: "Family-owned contractor, Eastern Province",
    metrics: [
      { label: "Days to first draft", value: "11 → 2" },
      { label: "Reviewer NPS", value: "+38" },
    ],
  },
  {
    company: "Boutique advisory firm",
    industry: "Professional services",
    gradient: "bg-gradient-to-br from-amber-600 to-orange-700",
    quote:
      "We're a 24-person firm bidding against the Big Four. The compliance matrix surfaces gaps we used to discover at the eleventh hour. The activity log means our partners can audit a bid in 10 minutes instead of 2 hours.",
    author: "Managing Partner",
    role: "Strategy consultancy, Jeddah",
    metrics: [
      { label: "Partner review time", value: "−83%" },
      { label: "Win rate", value: "18% → 31%" },
    ],
  },
];

const LOGOS = [
  "MIDDLE EAST",
  "ARABIAN",
  "FUTURE",
  "PINNACLE",
  "CRESCENT",
  "VERTEX",
];

import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { Reveal } from "@/components/reveal";

export const metadata = {
  title: "Security & Privacy — Etimad Copilot",
  description:
    "How Etimad Copilot protects your tender data: encryption, PDPL compliance, data residency, access controls, and the ground truth on what we do (and don't do) with your information.",
};

export default function SecurityPage() {
  return (
    <main className="flex-1 bg-mesh dark:bg-stone-950 min-h-screen">
      <SiteNav />

      {/* Hero */}
      <section className="px-6 pt-16 pb-10">
        <div className="max-w-4xl mx-auto text-center">
          <Reveal>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400 mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Security & Privacy
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-stone-950 dark:text-stone-50">
              Tenders contain your most sensitive commercial details.
              <br />
              <span className="text-emerald-700 dark:text-emerald-400">
                We treat them that way.
              </span>
            </h1>
            <p className="mt-5 text-stone-600 dark:text-stone-400 text-lg max-w-2xl mx-auto">
              Encryption, role-based access, audit logging and PDPL-aligned data handling — included on every plan, not gated behind Enterprise.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Pillars */}
      <section className="px-6 pb-12">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PILLARS.map((p) => (
            <Reveal key={p.title}>
              <div className="h-full rounded-2xl bg-white dark:bg-stone-900 ring-1 ring-stone-200 dark:ring-stone-800 p-6">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-lg font-semibold">
                  {p.icon}
                </div>
                <h3 className="mt-4 text-base font-semibold text-stone-950 dark:text-stone-50">
                  {p.title}
                </h3>
                <p className="mt-1.5 text-sm text-stone-600 dark:text-stone-400">
                  {p.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Detail sections */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto space-y-12">
          {SECTIONS.map((s) => (
            <Reveal key={s.heading}>
              <div>
                <h2 className="text-xl font-bold text-stone-950 dark:text-stone-50">
                  {s.heading}
                </h2>
                <div className="mt-4 space-y-3 text-stone-700 dark:text-stone-300 text-sm leading-relaxed">
                  {s.paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
                {s.bullets && (
                  <ul className="mt-4 space-y-2">
                    {s.bullets.map((b, i) => (
                      <li
                        key={i}
                        className="flex gap-3 text-sm text-stone-700 dark:text-stone-300"
                      >
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="px-6 pb-24">
        <div className="max-w-3xl mx-auto rounded-3xl bg-stone-900 dark:bg-stone-800 text-white p-10 text-center">
          <h2 className="text-2xl font-bold">Need a DPA, SOC 2 report, or pen-test summary?</h2>
          <p className="mt-3 text-stone-300 text-sm">
            We turn around vendor questionnaires in 5 business days. Reach out and a real human will respond.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <a
              href="mailto:security@etimad-copilot.app"
              className="rounded-lg bg-white text-stone-950 font-medium text-sm px-5 py-2.5 hover:bg-stone-100"
            >
              security@etimad-copilot.app
            </a>
            <Link
              href="/pricing"
              className="rounded-lg ring-1 ring-stone-600 text-white text-sm font-medium px-5 py-2.5 hover:ring-stone-400"
            >
              See plans
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

const PILLARS = [
  {
    icon: "🔒",
    title: "Encryption everywhere",
    body: "TLS 1.3 in transit. AES-256 at rest. Per-team data isolation enforced at the query layer.",
  },
  {
    icon: "🇸🇦",
    title: "PDPL-aligned",
    body: "Data subject rights honored — export, delete, correct. KSA data residency available on Enterprise.",
  },
  {
    icon: "👥",
    title: "Role-based access",
    body: "Viewer / editor / admin / owner. Owner-only billing actions. Every change captured in the audit log.",
  },
  {
    icon: "🧠",
    title: "Your data, not our model",
    body: "Company knowledge base stays in your private workspace. We don't train on customer content.",
  },
  {
    icon: "📜",
    title: "Full audit trail",
    body: "Every upload, edit, status change, invite and mention is logged with actor and timestamp.",
  },
  {
    icon: "🛡️",
    title: "Operational rigor",
    body: "Daily encrypted backups, point-in-time recovery, vulnerability scanning, dependency upgrades on a 30-day cadence.",
  },
];

const SECTIONS: Array<{
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}> = [
  {
    heading: "What we store",
    paragraphs: [
      "Only what's necessary to run the product: the RFP PDFs you upload, the company documents you add to your knowledge base, the proposals we generate, the comments and activity your team produces, and the minimal account metadata required for authentication and billing.",
    ],
    bullets: [
      "RFP PDFs and extracted text",
      "Company profile + knowledge base documents",
      "Generated proposals (EN + AR)",
      "Comments, activity log, notifications",
      "Account email, name, role, plan, Stripe customer ID",
    ],
  },
  {
    heading: "What we don't do",
    paragraphs: [
      "We've built this product specifically for sensitive procurement work. That dictates a few hard rules:",
    ],
    bullets: [
      "We don't train AI models on your content. Generation calls to Anthropic are zero-retention by contract.",
      "We don't sell, share or syndicate your tender data to anyone. Ever.",
      "We don't auto-submit to the Etimad portal on your behalf — bids stay your decision.",
      "We don't expose tender data across team boundaries. Period.",
    ],
  },
  {
    heading: "PDPL compliance",
    paragraphs: [
      "Saudi Arabia's Personal Data Protection Law (PDPL) governs how personal data is processed for Saudi residents. We're aligned by design:",
      "Data subjects can request access, correction, or deletion of their personal data by emailing security@etimad-copilot.app — we respond within 30 days. For enterprise customers we sign a Data Processing Agreement (DPA) and offer KSA data residency on Supabase's MENA region.",
    ],
    bullets: [
      "Lawful basis: contract performance for paid plans, legitimate interest for trial accounts",
      "Data minimization: we collect only what's needed to deliver the product",
      "Retention: deleted accounts are purged within 30 days from primary storage, 90 days from backups",
      "Sub-processors: Anthropic (AI), Stripe (billing), Resend (email), Supabase (auth + DB), Cloudflare R2 (file storage). Full list available on request.",
    ],
  },
  {
    heading: "Authentication & access control",
    paragraphs: [
      "Sign-in is handled by Supabase Auth — JWT-based, with short-lived access tokens. Passwords are never stored by us. We support magic-link and OAuth sign-in (Google, GitHub). SSO via SAML is available on Enterprise.",
      "Within the product, every API call is scoped to your team. Roles are enforced server-side, not just hidden in the UI — a viewer literally cannot post a comment or change a status, even via a hand-crafted request.",
    ],
  },
  {
    heading: "Infrastructure",
    paragraphs: [
      "Production runs on dedicated infrastructure in the EU (default) or KSA (Enterprise). Postgres is managed by Supabase with daily encrypted backups and point-in-time recovery. Files live in Cloudflare R2 with object-level encryption.",
      "We use a single primary region with read replicas for resilience. RPO is 24 hours; RTO is under 4 hours for a regional incident.",
    ],
  },
  {
    heading: "Incident response",
    paragraphs: [
      "Security incidents are triaged by the engineering team on-call. Customer-facing breaches that impact personal data are disclosed within 72 hours per PDPL Article 20. A status page tracks ongoing incidents at status.etimad-copilot.app.",
    ],
  },
  {
    heading: "Reporting a vulnerability",
    paragraphs: [
      "Found something? Email security@etimad-copilot.app with steps to reproduce. We acknowledge within 1 business day, fix critical issues within 7 days, and credit researchers in our hall of fame (with permission).",
    ],
  },
];

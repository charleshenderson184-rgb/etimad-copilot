"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createTeamInvite,
  TeamRole,
  uploadRFP,
} from "@/lib/api";
import { authedFetch } from "@/lib/api";

const STORAGE_KEY = "etimad_onboarding_done";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** Returns true if the user should see the wizard. Checks localStorage. */
export function shouldShowOnboarding(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) !== "1";
}

export function markOnboardingDone() {
  if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, "1");
}

interface Props {
  /** Show the wizard. The parent decides; this component renders the modal. */
  open: boolean;
  onClose: () => void;
}

type Step = 0 | 1 | 2 | 3;

export function OnboardingWizard({ open, onClose }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [closing, setClosing] = useState(false);

  const close = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      markOnboardingDone();
      setClosing(false);
      onClose();
    }, 180);
  }, [onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center px-4 transition-opacity duration-200 ${
        closing ? "opacity-0" : "opacity-100"
      }`}
    >
      <div
        className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm"
        onClick={close}
        aria-hidden
      />

      <div
        className={`relative z-10 w-full max-w-2xl rounded-3xl bg-white dark:bg-stone-900 ring-1 ring-stone-200 dark:ring-stone-800 shadow-2xl overflow-hidden transition-transform duration-200 ${
          closing ? "scale-95" : "scale-100"
        }`}
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-5 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400 font-semibold">
              Welcome to Etimad Copilot
            </div>
            <button
              onClick={close}
              className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-2xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <h2 className="mt-2 text-2xl font-bold text-stone-950 dark:text-stone-50">
            {step === 0 && "Get set up in 3 minutes"}
            {step === 1 && "Upload your first tender"}
            {step === 2 && "Tell us about your company"}
            {step === 3 && "Invite your team"}
          </h2>
          <p className="mt-1.5 text-sm text-stone-600 dark:text-stone-400">
            {step === 0 && "Three quick steps will get you to your first proposal draft."}
            {step === 1 && "Drop an RFP PDF. We'll extract every requirement automatically."}
            {step === 2 && "Used to personalize your proposals. Skip if you'd rather do it later."}
            {step === 3 && "Reviewers, bid managers, partners — anyone you'll collaborate with."}
          </p>

          {/* Progress dots */}
          <div className="mt-5 flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  s <= step
                    ? "bg-emerald-500"
                    : "bg-stone-200 dark:bg-stone-800"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6 min-h-[260px]">
          {step === 0 && <Intro onStart={() => setStep(1)} onSkip={close} />}
          {step === 1 && (
            <StepUpload
              onDone={(rfpId) => {
                setStep(2);
                // navigate after wizard closes — let user finish onboarding first
                // user can revisit the RFP from dashboard
              }}
              onSkip={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <StepProfile onDone={() => setStep(3)} onSkip={() => setStep(3)} />
          )}
          {step === 3 && (
            <StepInvite
              onDone={() => {
                close();
                router.refresh();
              }}
              onSkip={() => {
                close();
                router.refresh();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step 0 — Intro ───────────────────────────────────────────

function Intro({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  const items = [
    {
      n: 1,
      title: "Upload an RFP",
      desc: "Drop a PDF. We extract every requirement, deadline, and scoring criterion automatically.",
    },
    {
      n: 2,
      title: "Set up your company",
      desc: "Name, services, Saudization %. Drives personalized proposal drafts.",
    },
    {
      n: 3,
      title: "Invite teammates",
      desc: "Bid managers, reviewers, partners. Comments, @mentions and audit trail included.",
    },
  ];
  return (
    <>
      <ul className="space-y-3">
        {items.map((it) => (
          <li
            key={it.n}
            className="flex gap-4 p-3 rounded-xl ring-1 ring-stone-100 dark:ring-stone-800"
          >
            <div className="flex-shrink-0 h-9 w-9 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center justify-center text-sm">
              {it.n}
            </div>
            <div>
              <div className="text-sm font-semibold text-stone-950 dark:text-stone-50">
                {it.title}
              </div>
              <div className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                {it.desc}
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={onSkip}
          className="text-sm text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
        >
          I'll explore on my own
        </button>
        <button
          onClick={onStart}
          className="rounded-lg bg-stone-900 dark:bg-emerald-600 text-white text-sm font-medium px-5 py-2.5 hover:bg-stone-800 dark:hover:bg-emerald-500"
        >
          Let's go →
        </button>
      </div>
    </>
  );
}

// ─── Step 1 — Upload first RFP ────────────────────────────────

function StepUpload({
  onDone,
  onSkip,
}: {
  onDone: (rfpId: string) => void;
  onSkip: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("PDF files only.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const rfp = await uploadRFP(file);
      onDone(rfp.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <label
        htmlFor="onboarding-file"
        className="block rounded-2xl border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors p-10 text-center cursor-pointer"
      >
        <input
          id="onboarding-file"
          type="file"
          accept=".pdf"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
            <div className="text-sm text-stone-600 dark:text-stone-400">
              Uploading and analyzing…
            </div>
          </div>
        ) : (
          <>
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-2xl">
              ↑
            </div>
            <div className="mt-3 text-sm font-semibold text-stone-950 dark:text-stone-50">
              Click to upload a PDF
            </div>
            <div className="text-xs text-stone-500 mt-1">
              Or drag &amp; drop · Arabic + English supported · Max 50 MB
            </div>
          </>
        )}
      </label>
      {error && (
        <div className="mt-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 text-sm px-3 py-2">
          {error}
        </div>
      )}
      <div className="mt-5 flex items-center justify-between">
        <button
          onClick={onSkip}
          className="text-sm text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
        >
          Skip — I'll upload later
        </button>
      </div>
    </>
  );
}

// ─── Step 2 — Company profile basics ──────────────────────────

function StepProfile({
  onDone,
  onSkip,
}: {
  onDone: () => void;
  onSkip: () => void;
}) {
  const [name, setName] = useState("");
  const [services, setServices] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Company name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await authedFetch(`${API_BASE}/api/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: name.trim(),
          services: services.trim() ? JSON.stringify(services.split(",").map((s) => s.trim()).filter(Boolean)) : null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to save");
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
          Company name <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Aramco Digital Solutions"
          className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 px-3 py-2 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
          Top 3 services you offer
        </label>
        <input
          type="text"
          value={services}
          onChange={(e) => setServices(e.target.value)}
          placeholder="e.g. Cloud migration, Cybersecurity audits, ERP implementation"
          className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 px-3 py-2 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <p className="text-xs text-stone-500 mt-1">Comma-separated. You can refine this later.</p>
      </div>
      {error && (
        <div className="rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 text-sm px-3 py-2">
          {error}
        </div>
      )}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
        >
          Skip for now
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-stone-900 dark:bg-emerald-600 text-white text-sm font-medium px-5 py-2.5 hover:bg-stone-800 dark:hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save & continue →"}
        </button>
      </div>
    </form>
  );
}

// ─── Step 3 — Invite teammates ────────────────────────────────

function StepInvite({
  onDone,
  onSkip,
}: {
  onDone: () => void;
  onSkip: () => void;
}) {
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState<TeamRole>("editor");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(0);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const list = emails
      .split(/[,\n\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.includes("@"));
    if (list.length === 0) {
      setError("Enter at least one email address.");
      return;
    }
    setSending(true);
    setError(null);
    let success = 0;
    for (const email of list) {
      try {
        await createTeamInvite(email, role);
        success += 1;
      } catch {
        /* ignore individual failures */
      }
    }
    setSent(success);
    setSending(false);
    if (success > 0) {
      setTimeout(onDone, 1200);
    } else {
      setError("None of the invites went through. Check the addresses or your plan's seat limit.");
    }
  };

  return (
    <form onSubmit={send} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
          Teammate emails
        </label>
        <textarea
          rows={3}
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          placeholder="bid.manager@yourcompany.com&#10;reviewer@yourcompany.com"
          className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 px-3 py-2 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
        />
        <p className="text-xs text-stone-500 mt-1">
          Separate with commas, spaces, or new lines.
        </p>
      </div>
      <div>
        <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
          Default role
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as TeamRole)}
          className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 px-3 py-2 text-sm text-stone-900 dark:text-stone-100"
        >
          <option value="viewer">Viewer — read-only</option>
          <option value="editor">Editor — create + edit proposals</option>
          <option value="admin">Admin — manage members + billing</option>
        </select>
      </div>
      {error && (
        <div className="rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 text-sm px-3 py-2">
          {error}
        </div>
      )}
      {sent > 0 && (
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 text-sm px-3 py-2">
          ✓ {sent} invite{sent === 1 ? "" : "s"} sent.
        </div>
      )}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
        >
          Skip — finish onboarding
        </button>
        <button
          type="submit"
          disabled={sending}
          className="rounded-lg bg-stone-900 dark:bg-emerald-600 text-white text-sm font-medium px-5 py-2.5 hover:bg-stone-800 dark:hover:bg-emerald-500 disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send invites & finish"}
        </button>
      </div>
    </form>
  );
}

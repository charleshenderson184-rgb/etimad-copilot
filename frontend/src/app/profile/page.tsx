"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SiteNav } from "@/components/site-nav";
import { Reveal } from "@/components/reveal";
import { AnimatedCounter } from "@/components/animated-counter";
import { useAuth } from "@/lib/auth";
import {
  CompanyDocument,
  CompanyProfile,
  deleteCompanyDocument,
  getProfile,
  listCompanyDocuments,
  saveProfile,
  uploadCompanyDocument,
} from "@/lib/api";

const DOC_TYPES = [
  {
    value: "past_proposal",
    label: "Past Proposal",
    labelAr: "عرض سابق",
    desc: "Previous tender submissions",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.6}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    ),
  },
  {
    value: "capability_statement",
    label: "Capability Statement",
    labelAr: "بيان القدرات",
    desc: "Services and expertise",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.6}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    ),
  },
  {
    value: "cv",
    label: "Team CV",
    labelAr: "سيرة ذاتية",
    desc: "Key personnel bios",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.6}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    ),
  },
  {
    value: "certificate",
    label: "Certificate",
    labelAr: "شهادة",
    desc: "ISO, LCGPA, awards",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.6}
        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
      />
    ),
  },
  {
    value: "other",
    label: "Other",
    labelAr: "أخرى",
    desc: "Anything else useful",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.6}
        d="M12 6V4m0 16v-2m6-6h2M4 12h2m12.728-6.728l-1.414 1.414M6.686 17.314l-1.414 1.414m12.728 0l-1.414-1.414M6.686 6.686L5.272 5.272"
      />
    ),
  },
];

const initialProfile: Omit<CompanyProfile, "id" | "document_count"> = {
  company_name: "",
  company_name_ar: "",
  description: "",
  services: "",
  industries: "",
  team_size: null,
  saudization_pct: null,
  cr_number: "",
  vat_number: "",
  lcgpa_certificate: "",
  iso_certifications: "",
  saudi_address: "",
  contact_email: "",
  contact_phone: "",
};

const FILE_TYPE_ICONS: Record<string, string> = {
  pdf: "📄",
  docx: "📝",
  xlsx: "📊",
  image: "🖼️",
  text: "📃",
};

export default function ProfilePage() {
  return (
    <Suspense fallback={<main className="flex-1 flex items-center justify-center"><div className="animate-spin h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full" /></main>}>
      <ProfilePageContent />
    </Suspense>
  );
}

function ProfilePageContent() {
  const { user, trackUsage } = useAuth();
  const searchParams = useSearchParams();
  const isWelcome = searchParams.get("welcome") === "1";

  const [profile, setProfile] = useState(initialProfile);
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProfile().then((p) => {
      if (p) {
        setProfile({
          company_name: p.company_name,
          company_name_ar: p.company_name_ar ?? "",
          description: p.description ?? "",
          services: p.services ?? "",
          industries: p.industries ?? "",
          team_size: p.team_size ?? null,
          saudization_pct: p.saudization_pct ?? null,
          cr_number: p.cr_number ?? "",
          vat_number: p.vat_number ?? "",
          lcgpa_certificate: p.lcgpa_certificate ?? "",
          iso_certifications: p.iso_certifications ?? "",
          saudi_address: p.saudi_address ?? "",
          contact_email: p.contact_email ?? "",
          contact_phone: p.contact_phone ?? "",
        });
      } else if (user) {
        setProfile((prev) => ({
          ...prev,
          company_name: user.company ?? "",
          contact_email: user.email,
        }));
      }
    });
    listCompanyDocuments().then(setDocuments);
  }, [user]);

  // Completeness calculation
  const completeness = useMemo(() => {
    const fields = [
      profile.company_name,
      profile.company_name_ar,
      profile.description,
      profile.services,
      profile.industries,
      profile.team_size,
      profile.saudization_pct,
      profile.cr_number,
      profile.vat_number,
      profile.lcgpa_certificate,
      profile.iso_certifications,
      profile.saudi_address,
      profile.contact_email,
      profile.contact_phone,
    ];
    const filled = fields.filter((f) => f !== "" && f !== null && f !== undefined).length;
    return Math.round((filled / fields.length) * 100);
  }, [profile]);

  const indexedDocCount = documents.filter((d) => d.summary).length;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await saveProfile(profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (file: File, docType: string) => {
    setUploadingType(docType);
    setError(null);
    try {
      const doc = await uploadCompanyDocument(file, docType);
      setDocuments((prev) => [doc, ...prev]);
      trackUsage("documents_uploaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingType(null);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    try {
      await deleteCompanyDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <main className="flex-1 bg-mesh min-h-screen">
      <SiteNav />

      {isWelcome && (
        <div className="relative bg-gradient-to-r from-emerald-50 via-emerald-100/60 to-emerald-50 border-b border-emerald-200/60 animate-fade-in-down">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white shadow-sm ring-1 ring-emerald-200 flex items-center justify-center text-xl">
              👋
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-emerald-900">
                Welcome to Etimad Copilot, {user?.name?.split(" ")[0]}!
              </div>
              <div className="text-xs text-emerald-800/70">
                Let&apos;s set up your company so we can draft proposals in your voice.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="px-6 pt-10 pb-6">
        <div className="max-w-5xl mx-auto animate-fade-in-up">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-2">
            Company Setup
          </p>
          <h1 className="text-4xl font-bold text-stone-900 tracking-tight mb-2">
            Your Company Profile
          </h1>
          <p className="text-stone-600 max-w-2xl leading-relaxed">
            Used to draft proposals in your voice. Every field improves
            proposal quality and compliance scoring.
          </p>
          <p className="text-sm text-stone-500 mt-1" dir="rtl">
            تُستخدم لكتابة العروض باسم شركتك
          </p>
        </div>
      </section>

      {/* Stats / completeness */}
      <section className="px-6 pb-8">
        <Reveal>
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Completeness card */}
            <div className="md:col-span-1 bg-gradient-to-br from-emerald-800 via-emerald-900 to-stone-900 rounded-2xl p-6 text-white relative overflow-hidden shadow-xl">
              <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full border border-emerald-700/40 animate-rotate-slow" />
              <div className="relative">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300 mb-3">
                  Profile Completeness
                </p>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-5xl font-bold tracking-tight">
                    <AnimatedCounter value={completeness} />%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-2">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-300 to-emerald-500 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${completeness}%` }}
                  />
                </div>
                <p className="text-xs text-emerald-200/70">
                  {completeness < 50
                    ? "Add more details to improve proposal quality."
                    : completeness < 80
                    ? "Looking good — keep going for best results."
                    : "Excellent profile. You're ready to win tenders."}
                </p>
              </div>
            </div>

            {/* Documents stat */}
            <div className="bg-white rounded-2xl p-6 ring-1 ring-stone-200">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  Knowledge Base
                </p>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-emerald-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
              </div>
              <div className="text-4xl font-bold text-stone-900 tracking-tight">
                <AnimatedCounter value={documents.length} />
              </div>
              <p className="text-sm text-stone-500 mt-1">
                Documents uploaded
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {indexedDocCount} indexed
                </span>
                {documents.length - indexedDocCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                    <div className="animate-spin h-2.5 w-2.5 border border-amber-600 border-t-transparent rounded-full" />
                    {documents.length - indexedDocCount} processing
                  </span>
                )}
              </div>
            </div>

            {/* Compliance score */}
            <div className="bg-white rounded-2xl p-6 ring-1 ring-stone-200">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                  LCGPA Readiness
                </p>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-emerald-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
              </div>
              <div className="text-4xl font-bold text-stone-900 tracking-tight">
                <AnimatedCounter
                  value={profile.saudization_pct ?? 0}
                  decimals={0}
                  suffix="%"
                />
              </div>
              <p className="text-sm text-stone-500 mt-1">
                Saudization rate
              </p>
              <div className="mt-3 text-xs text-stone-500">
                {(profile.saudization_pct ?? 0) >= 60 ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                    <svg
                      className="w-3 h-3"
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
                    Above LCGPA minimum (60%)
                  </span>
                ) : (
                  <span className="text-amber-600">
                    Target: 60% minimum for LCGPA
                  </span>
                )}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Profile form */}
      <section className="px-6 pb-10">
        <form onSubmit={handleSave} className="max-w-5xl mx-auto" data-tour="profile-form">
          <Reveal>
            <div className="bg-white rounded-3xl ring-1 ring-stone-200/80 shadow-sm overflow-hidden">
              <FormSection
                title="Company Identity"
                subtitle="Basic information about your business"
                step="01"
              >
                <Field
                  label="Company Name (English)"
                  labelAr="اسم الشركة"
                  required
                  value={profile.company_name}
                  onChange={(v) => setProfile({ ...profile, company_name: v })}
                />
                <Field
                  label="Company Name (Arabic)"
                  labelAr="الاسم العربي"
                  value={profile.company_name_ar ?? ""}
                  onChange={(v) =>
                    setProfile({ ...profile, company_name_ar: v })
                  }
                  dir="rtl"
                />
                <FieldTextarea
                  label="Description"
                  labelAr="نبذة"
                  value={profile.description ?? ""}
                  onChange={(v) => setProfile({ ...profile, description: v })}
                  fullWidth
                  placeholder="What your company does, in 2-3 sentences"
                />
                <FieldTextarea
                  label="Services Offered"
                  labelAr="الخدمات"
                  value={profile.services ?? ""}
                  onChange={(v) => setProfile({ ...profile, services: v })}
                  fullWidth
                  placeholder="Comma-separated: IT consulting, Software development, ..."
                />
                <Field
                  label="Industries"
                  labelAr="القطاعات"
                  value={profile.industries ?? ""}
                  onChange={(v) => setProfile({ ...profile, industries: v })}
                  fullWidth
                  placeholder="Government, Healthcare, Finance, ..."
                />
              </FormSection>

              <FormSection
                title="Compliance & Certifications"
                subtitle="Critical for LCGPA and Saudization scoring"
                step="02"
                tinted
              >
                <Field
                  label="Team Size"
                  labelAr="حجم الفريق"
                  type="number"
                  value={profile.team_size?.toString() ?? ""}
                  onChange={(v) =>
                    setProfile({ ...profile, team_size: v ? parseInt(v) : null })
                  }
                />
                <Field
                  label="Saudization %"
                  labelAr="نسبة التوطين"
                  type="number"
                  value={profile.saudization_pct?.toString() ?? ""}
                  onChange={(v) =>
                    setProfile({
                      ...profile,
                      saudization_pct: v ? parseFloat(v) : null,
                    })
                  }
                  suffix="%"
                />
                <Field
                  label="CR Number"
                  labelAr="السجل التجاري"
                  value={profile.cr_number ?? ""}
                  onChange={(v) => setProfile({ ...profile, cr_number: v })}
                />
                <Field
                  label="VAT Number"
                  labelAr="الرقم الضريبي"
                  value={profile.vat_number ?? ""}
                  onChange={(v) => setProfile({ ...profile, vat_number: v })}
                />
                <Field
                  label="LCGPA Certificate"
                  labelAr="شهادة المحتوى المحلي"
                  value={profile.lcgpa_certificate ?? ""}
                  onChange={(v) =>
                    setProfile({ ...profile, lcgpa_certificate: v })
                  }
                  fullWidth
                  placeholder="Certificate number or 'Pending'"
                />
                <Field
                  label="ISO Certifications"
                  labelAr="شهادات الأيزو"
                  value={profile.iso_certifications ?? ""}
                  onChange={(v) =>
                    setProfile({ ...profile, iso_certifications: v })
                  }
                  fullWidth
                  placeholder="ISO 9001, ISO 27001, ..."
                />
              </FormSection>

              <FormSection title="Contact" subtitle="How buyers can reach you" step="03">
                <Field
                  label="Saudi Office Address"
                  labelAr="العنوان"
                  value={profile.saudi_address ?? ""}
                  onChange={(v) => setProfile({ ...profile, saudi_address: v })}
                  fullWidth
                />
                <Field
                  label="Email"
                  labelAr="البريد"
                  type="email"
                  value={profile.contact_email ?? ""}
                  onChange={(v) => setProfile({ ...profile, contact_email: v })}
                />
                <Field
                  label="Phone"
                  labelAr="الجوال"
                  value={profile.contact_phone ?? ""}
                  onChange={(v) => setProfile({ ...profile, contact_phone: v })}
                />
              </FormSection>

              <div className="p-6 bg-stone-50/40 border-t border-stone-100 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 min-h-[24px]">
                  {saved && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700 font-medium animate-fade-in-down">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Saved
                    </span>
                  )}
                  {error && (
                    <span className="text-sm text-red-600">{error}</span>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={saving || !profile.company_name.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-900 text-white text-sm font-semibold hover:shadow-lg hover:from-emerald-600 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                      Saving...
                    </>
                  ) : (
                    "Save Profile"
                  )}
                </button>
              </div>
            </div>
          </Reveal>
        </form>
      </section>

      {/* Knowledge base */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-2">
                Knowledge Base
              </p>
              <h2 className="text-3xl font-bold text-stone-900 mb-2 tracking-tight">
                Train the platform on your wins
              </h2>
              <p className="text-stone-600 max-w-2xl leading-relaxed">
                Upload past proposals, capability statements, team CVs, and
                certifications. Each file becomes searchable context for
                future proposal drafts.
              </p>
              <p className="text-sm text-stone-500 mt-1" dir="rtl">
                ارفع العروض السابقة لتعزيز جودة العروض المُنشأة
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {DOC_TYPES.map((type, i) => (
              <Reveal key={type.value} delay={i * 80}>
                <DocUploadCard
                  type={type}
                  uploading={uploadingType === type.value}
                  onUpload={(file) => handleUpload(file, type.value)}
                />
              </Reveal>
            ))}
          </div>

          {documents.length > 0 && (
            <Reveal>
              <div className="bg-white rounded-3xl ring-1 ring-stone-200/80 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-stone-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-stone-900">
                      Uploaded Documents
                    </h3>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {documents.length} file{documents.length !== 1 ? "s" : ""}{" "}
                      in your knowledge base
                    </p>
                  </div>
                  <div className="text-xs text-stone-400">
                    {indexedDocCount} / {documents.length} indexed
                  </div>
                </div>
                <div className="divide-y divide-stone-100">
                  {documents.map((doc, i) => (
                    <DocumentRow
                      key={doc.id}
                      doc={doc}
                      onDelete={() => handleDeleteDoc(doc.id)}
                      delay={i * 60}
                    />
                  ))}
                </div>
              </div>
            </Reveal>
          )}
        </div>
      </section>
    </main>
  );
}

function FormSection({
  title,
  subtitle,
  step,
  tinted,
  children,
}: {
  title: string;
  subtitle: string;
  step: string;
  tinted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <div
        className={`p-6 ${
          tinted ? "bg-stone-50/40 border-y" : "border-b"
        } border-stone-100 flex items-start justify-between gap-4`}
      >
        <div>
          <h2 className="font-semibold text-stone-900 tracking-tight">
            {title}
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>
        </div>
        <span className="text-xs font-mono font-medium text-emerald-700/60">
          {step}
        </span>
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
        {children}
      </div>
    </>
  );
}

function Field({
  label,
  labelAr,
  value,
  onChange,
  type = "text",
  required = false,
  fullWidth = false,
  placeholder,
  suffix,
  dir,
}: {
  label: string;
  labelAr: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  fullWidth?: boolean;
  placeholder?: string;
  suffix?: string;
  dir?: "rtl" | "ltr";
}) {
  return (
    <div className={fullWidth ? "md:col-span-2" : ""}>
      <label className="flex items-center justify-between text-xs font-medium text-stone-700 mb-1.5">
        <span>
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </span>
        <span className="text-stone-400" dir="rtl">
          {labelAr}
        </span>
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          dir={dir}
          required={required}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 transition-all hover:border-stone-300"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function FieldTextarea({
  label,
  labelAr,
  value,
  onChange,
  fullWidth = false,
  placeholder,
}: {
  label: string;
  labelAr: string;
  value: string;
  onChange: (v: string) => void;
  fullWidth?: boolean;
  placeholder?: string;
}) {
  return (
    <div className={fullWidth ? "md:col-span-2" : ""}>
      <label className="flex items-center justify-between text-xs font-medium text-stone-700 mb-1.5">
        <span>{label}</span>
        <span className="text-stone-400" dir="rtl">
          {labelAr}
        </span>
      </label>
      <textarea
        value={value}
        rows={2}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 transition-all resize-none hover:border-stone-300"
      />
    </div>
  );
}

function DocUploadCard({
  type,
  uploading,
  onUpload,
}: {
  type: {
    value: string;
    label: string;
    labelAr: string;
    desc: string;
    icon: React.ReactNode;
  };
  uploading: boolean;
  onUpload: (file: File) => void;
}) {
  return (
    <label
      className={`relative flex flex-col items-start p-5 rounded-2xl bg-white ring-1 ring-stone-200 hover:ring-emerald-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group ${
        uploading ? "pointer-events-none opacity-60" : ""
      }`}
    >
      <div className="flex items-start justify-between w-full mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 ring-1 ring-emerald-100 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
          {uploading ? (
            <div className="animate-spin h-4 w-4 border-2 border-emerald-700 border-t-transparent rounded-full" />
          ) : (
            <svg
              className="w-5 h-5 text-emerald-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {type.icon}
            </svg>
          )}
        </div>
        <div className="w-7 h-7 rounded-lg bg-stone-50 ring-1 ring-stone-200 flex items-center justify-center text-stone-400 group-hover:bg-emerald-50 group-hover:ring-emerald-200 group-hover:text-emerald-700 transition-all">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </div>
      </div>
      <p className="text-sm font-semibold text-stone-900">{type.label}</p>
      <p className="text-xs text-stone-400 mt-0.5" dir="rtl">
        {type.labelAr}
      </p>
      <p className="text-xs text-stone-500 mt-2 leading-relaxed">{type.desc}</p>

      {/* Decorative line */}
      <div className="absolute bottom-0 left-5 right-5 h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-700 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left rounded-full" />

      <input
        type="file"
        accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.txt"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
        }}
      />
    </label>
  );
}

function DocumentRow({
  doc,
  onDelete,
  delay,
}: {
  doc: CompanyDocument;
  onDelete: () => void;
  delay: number;
}) {
  const docTypeLabel =
    DOC_TYPES.find((t) => t.value === doc.document_type)?.label ??
    doc.document_type;

  return (
    <div
      className="p-4 flex items-center gap-4 hover:bg-stone-50/50 transition-colors animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center text-base">
        {FILE_TYPE_ICONS[doc.file_type] ?? "📎"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-900 truncate">
          {doc.filename}
        </p>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-stone-500">
          <span className="px-1.5 py-0.5 rounded bg-stone-100">
            {docTypeLabel}
          </span>
          {doc.summary ? (
            <span className="text-emerald-700 inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Indexed
            </span>
          ) : (
            <span className="text-amber-600 inline-flex items-center gap-1">
              <div className="animate-spin h-2.5 w-2.5 border border-amber-600 border-t-transparent rounded-full" />
              Processing
            </span>
          )}
        </div>
      </div>
      <button
        onClick={onDelete}
        className="text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors p-2 rounded-lg"
        aria-label="Delete"
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
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22"
          />
        </svg>
      </button>
    </div>
  );
}

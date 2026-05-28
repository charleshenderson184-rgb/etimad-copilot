"use client";

import { useState } from "react";
import { addManualTender, DiscoveredTenderResponse } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";

interface AddTenderModalProps {
  open: boolean;
  onClose: () => void;
  onAdded: (tender: DiscoveredTenderResponse) => void;
  defaultSource?: "user_paste" | "curator";
}

export function AddTenderModal({
  open,
  onClose,
  onAdded,
  defaultSource = "user_paste",
}: AddTenderModalProps) {
  const { user } = useAuth();
  const { show } = useToast();

  const [source, setSource] = useState<"user_paste" | "curator">(defaultSource);
  const [title, setTitle] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [buyer, setBuyer] = useState("");
  const [buyerAr, setBuyerAr] = useState("");
  const [externalId, setExternalId] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [deadline, setDeadline] = useState("");
  const [lcgpaMin, setLcgpaMin] = useState("");
  const [saudizationMin, setSaudizationMin] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setTitle("");
    setTitleAr("");
    setBuyer("");
    setBuyerAr("");
    setExternalId("");
    setSourceUrl("");
    setIndustry("");
    setDescription("");
    setEstimatedValue("");
    setDeadline("");
    setLcgpaMin("");
    setSaudizationMin("");
    setNotes("");
    setError(null);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const tender = await addManualTender({
        title,
        title_ar: titleAr || undefined,
        buyer,
        buyer_ar: buyerAr || undefined,
        external_id: externalId || undefined,
        source_url: sourceUrl || undefined,
        industry: industry || undefined,
        description: description || undefined,
        estimated_value_sar: estimatedValue ? parseFloat(estimatedValue) : null,
        submission_deadline: deadline
          ? new Date(deadline).toISOString()
          : null,
        lcgpa_min_score: lcgpaMin ? parseFloat(lcgpaMin) : null,
        saudization_min: saudizationMin ? parseFloat(saudizationMin) : null,
        source,
        added_by: user?.email,
        notes: notes || undefined,
      });
      show({
        variant: "success",
        title: "Tender added",
        message: `"${tender.title.slice(0, 40)}${tender.title.length > 40 ? "…" : ""}" is in your feed.`,
      });
      reset();
      onClose();
      onAdded(tender);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add tender");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-fade-in"
      onClick={handleClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto ring-1 ring-stone-200 dark:ring-stone-800 animate-scale-in"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-stone-900 px-6 py-4 border-b border-stone-100 dark:border-stone-800 flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-emerald-700 dark:text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                Add a tender to your feed
              </h2>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 ml-10">
              Manually enter tender details. Once added, you can pursue it like
              any discovered tender.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors disabled:opacity-50"
            aria-label="Close"
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
                strokeWidth={2.5}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Source toggle */}
          <div className="flex items-center gap-2 p-1 rounded-lg bg-stone-50 dark:bg-stone-800/60 w-fit">
            {(
              [
                { v: "user_paste", label: "From a tender I found" },
                { v: "curator", label: "Curator entry" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setSource(opt.v)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  source === opt.v
                    ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm"
                    : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Identity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Title (English)"
              labelAr="العنوان"
              required
              value={title}
              onChange={setTitle}
              placeholder="National Data Platform Modernization"
            />
            <Field
              label="Title (Arabic)"
              labelAr="العنوان العربي"
              value={titleAr}
              onChange={setTitleAr}
              dir="rtl"
            />
            <Field
              label="Buyer"
              labelAr="جهة الشراء"
              required
              value={buyer}
              onChange={setBuyer}
              placeholder="Ministry of Health"
            />
            <Field
              label="Buyer (Arabic)"
              labelAr="الجهة بالعربي"
              value={buyerAr}
              onChange={setBuyerAr}
              dir="rtl"
            />
            <Field
              label="Reference Number"
              labelAr="رقم المنافسة"
              value={externalId}
              onChange={setExternalId}
              placeholder="ET-2026-MOH-4421"
            />
            <Field
              label="Source URL"
              labelAr="الرابط"
              value={sourceUrl}
              onChange={setSourceUrl}
              placeholder="https://tenders.etimad.sa/..."
            />
          </div>

          {/* Details */}
          <div>
            <FieldTextarea
              label="Description"
              labelAr="الوصف"
              value={description}
              onChange={setDescription}
              placeholder="What is this tender for? 1-2 sentences."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Industry / Sector"
              labelAr="القطاع"
              value={industry}
              onChange={setIndustry}
              placeholder="Healthcare, Software development"
            />
            <Field
              label="Estimated Value (SAR)"
              labelAr="القيمة التقديرية"
              type="number"
              value={estimatedValue}
              onChange={setEstimatedValue}
              placeholder="12500000"
              suffix="SAR"
            />
            <Field
              label="Submission Deadline"
              labelAr="آخر موعد"
              type="datetime-local"
              value={deadline}
              onChange={setDeadline}
            />
            <div className="grid grid-cols-2 gap-2">
              <Field
                label="LCGPA Min %"
                labelAr="الحد الأدنى للمحتوى"
                type="number"
                value={lcgpaMin}
                onChange={setLcgpaMin}
                placeholder="40"
                suffix="%"
              />
              <Field
                label="Saudization Min %"
                labelAr="الحد للتوطين"
                type="number"
                value={saudizationMin}
                onChange={setSaudizationMin}
                placeholder="60"
                suffix="%"
              />
            </div>
          </div>

          <FieldTextarea
            label="Notes (private)"
            labelAr="ملاحظات"
            value={notes}
            onChange={setNotes}
            placeholder="Anything to remember about this tender (only you see this)."
          />

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/60 rounded-lg text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-stone-50/80 dark:bg-stone-800/60 backdrop-blur-md px-6 py-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-3">
          <p className="text-xs text-stone-500 dark:text-stone-400 hidden sm:block">
            This tender will appear in your discovery feed and can be pursued
            like any other.
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim() || !buyer.trim()}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-br from-emerald-700 to-emerald-900 text-white text-sm font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? (
                <>
                  <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                  Adding...
                </>
              ) : (
                <>Add to feed</>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  labelAr,
  value,
  onChange,
  type = "text",
  required = false,
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
  placeholder?: string;
  suffix?: string;
  dir?: "rtl" | "ltr";
}) {
  return (
    <div>
      <label className="flex items-center justify-between text-xs font-medium text-stone-700 dark:text-stone-300 mb-1.5">
        <span>
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </span>
        <span className="text-stone-400 dark:text-stone-500" dir="rtl">
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
          className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-800 focus:border-emerald-500 transition-all"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 dark:text-stone-500 pointer-events-none">
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
  placeholder,
}: {
  label: string;
  labelAr: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="flex items-center justify-between text-xs font-medium text-stone-700 dark:text-stone-300 mb-1.5">
        <span>{label}</span>
        <span className="text-stone-400 dark:text-stone-500" dir="rtl">
          {labelAr}
        </span>
      </label>
      <textarea
        value={value}
        rows={2}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-800 focus:border-emerald-500 transition-all resize-none"
      />
    </div>
  );
}

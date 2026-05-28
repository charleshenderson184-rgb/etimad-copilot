"use client";

import { useState } from "react";
import type { RequirementResponse } from "@/lib/api";
import { RequirementDetailPanel } from "@/components/requirement-detail-panel";

const CATEGORY_LABELS: Record<
  string,
  { ar: string; en: string; color: string; ring: string; dot: string }
> = {
  technical: {
    ar: "فني",
    en: "Technical",
    color: "bg-blue-50 text-blue-800",
    ring: "ring-blue-200/60",
    dot: "bg-blue-500",
  },
  commercial: {
    ar: "مالي",
    en: "Commercial",
    color: "bg-amber-50 text-amber-800",
    ring: "ring-amber-200/60",
    dot: "bg-amber-500",
  },
  legal: {
    ar: "قانوني",
    en: "Legal",
    color: "bg-purple-50 text-purple-800",
    ring: "ring-purple-200/60",
    dot: "bg-purple-500",
  },
  lcgpa: {
    ar: "محتوى محلي",
    en: "LCGPA",
    color: "bg-emerald-50 text-emerald-800",
    ring: "ring-emerald-200/60",
    dot: "bg-emerald-500",
  },
  administrative: {
    ar: "إداري",
    en: "Admin",
    color: "bg-stone-100 text-stone-700",
    ring: "ring-stone-200/60",
    dot: "bg-stone-500",
  },
};

const STATUS_STYLES: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  pending: {
    label: "Pending",
    color: "bg-stone-100 text-stone-700 ring-1 ring-stone-200/60",
    icon: "○",
  },
  compliant: {
    label: "Compliant",
    color: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/60",
    icon: "✓",
  },
  gap: {
    label: "Gap",
    color: "bg-red-50 text-red-800 ring-1 ring-red-200/60",
    icon: "!",
  },
  unclear: {
    label: "Unclear",
    color: "bg-amber-50 text-amber-800 ring-1 ring-amber-200/60",
    icon: "?",
  },
};

function CategoryBadge({ category }: { category: string }) {
  const cat = CATEGORY_LABELS[category] || CATEGORY_LABELS.technical;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${cat.color} ring-1 ${cat.ring}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cat.dot}`} />
      {cat.en}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${s.color}`}
    >
      <span className="font-mono">{s.icon}</span>
      {s.label}
    </span>
  );
}

export function ComplianceMatrix({
  requirements,
  rfpId,
}: {
  requirements: RequirementResponse[];
  rfpId: string;
}) {
  const [filter, setFilter] = useState<string>("all");
  const [detailId, setDetailId] = useState<string | null>(null);

  const detailReq = requirements.find((r) => r.id === detailId) || null;

  const filtered =
    filter === "all"
      ? requirements
      : requirements.filter((r) => r.category === filter);

  const mandatoryCount = requirements.filter((r) => r.is_mandatory).length;
  const gapCount = requirements.filter(
    (r) => r.compliance_status === "gap"
  ).length;
  const compliantCount = requirements.filter(
    (r) => r.compliance_status === "compliant"
  ).length;
  const progressPct =
    requirements.length > 0
      ? Math.round((compliantCount / requirements.length) * 100)
      : 0;

  return (
    <div className="w-full max-w-5xl mx-auto animate-fade-in">
      {/* Summary card */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-stone-200/80 p-6 mb-6">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-1">
              Compliance Overview
            </p>
            <h2 className="text-2xl font-bold text-stone-900">
              {requirements.length} requirements extracted
            </h2>
            <p className="text-sm text-stone-500 mt-1" dir="rtl">
              تم استخراج {requirements.length} متطلب
            </p>
          </div>

          {/* Progress ring */}
          <div className="flex items-center gap-3">
            <div className="relative w-16 h-16">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="rgb(231 229 228)"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="rgb(4 120 87)"
                  strokeWidth="3"
                  strokeDasharray={`${progressPct} 100`}
                  strokeLinecap="round"
                  pathLength="100"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-stone-900">
                {progressPct}%
              </div>
            </div>
            <div className="text-xs text-stone-500 leading-tight">
              Complete
              <br />
              <span className="text-stone-400">مكتمل</span>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-stone-100">
          <Stat label="Total" sublabel="المجموع" value={requirements.length} color="text-stone-900" />
          <Stat label="Mandatory" sublabel="إلزامي" value={mandatoryCount} color="text-red-600" />
          <Stat label="Gaps" sublabel="ثغرات" value={gapCount} color="text-orange-600" />
          <Stat label="Compliant" sublabel="ممتثل" value={compliantCount} color="text-emerald-700" />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <FilterChip
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label="All"
          count={requirements.length}
        />
        {Object.entries(CATEGORY_LABELS).map(([key, val]) => {
          const count = requirements.filter((r) => r.category === key).length;
          if (count === 0) return null;
          return (
            <FilterChip
              key={key}
              active={filter === key}
              onClick={() => setFilter(key)}
              label={val.en}
              count={count}
            />
          );
        })}
      </div>

      {/* Requirements list */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl ring-1 ring-stone-200/80 p-12 text-center text-stone-500">
            No requirements in this category
          </div>
        ) : (
          filtered.map((req, idx) => (
            <div
              key={req.id}
              className="bg-white rounded-xl ring-1 ring-stone-200/80 hover:ring-emerald-200 hover:shadow-md transition-all duration-200 overflow-hidden"
            >
              <button
                onClick={() => setDetailId(req.id)}
                className="w-full p-5 text-left group"
              >
                <div className="flex items-start gap-4">
                  {/* Index */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-stone-50 ring-1 ring-stone-200/60 flex items-center justify-center text-xs font-mono font-medium text-stone-500">
                    {String(idx + 1).padStart(2, "0")}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                      <CategoryBadge category={req.category} />
                      <StatusBadge status={req.compliance_status} />
                      {req.is_mandatory && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-red-50 text-red-700 ring-1 ring-red-200/60">
                          <span className="w-1 h-1 rounded-full bg-red-600 animate-pulse" />
                          Required
                        </span>
                      )}
                      {req.source_page && (
                        <span className="text-xs text-stone-400 font-mono">
                          p.{req.source_page}
                        </span>
                      )}
                    </div>
                    <p
                      className="text-sm text-stone-900 leading-relaxed font-medium"
                      dir="auto"
                    >
                      {req.requirement_text}
                    </p>
                    {req.requirement_text_en &&
                      req.requirement_text_en !== req.requirement_text && (
                        <p className="text-sm text-stone-500 mt-1.5 leading-relaxed">
                          {req.requirement_text_en}
                        </p>
                      )}
                  </div>

                  {/* Open-in-panel affordance */}
                  <div className="flex-shrink-0 mt-0.5 flex items-center gap-1 text-stone-300 group-hover:text-emerald-600 transition-colors">
                    <span className="text-[10px] uppercase tracking-wider font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      View
                    </span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            </div>
          ))
        )}
      </div>

      <RequirementDetailPanel
        open={detailReq !== null}
        onClose={() => setDetailId(null)}
        requirement={detailReq}
        rfpId={rfpId}
      />
    </div>
  );
}

function Stat({
  label,
  sublabel,
  value,
  color,
}: {
  label: string;
  sublabel: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-stone-500 mt-0.5">{label}</div>
      <div className="text-xs text-stone-400" dir="rtl">
        {sublabel}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
        active
          ? "bg-stone-900 text-white shadow-sm"
          : "bg-white text-stone-600 ring-1 ring-stone-200 hover:ring-stone-300 hover:text-stone-900"
      }`}
    >
      {label}
      <span
        className={`px-1.5 py-0.5 rounded text-[10px] ${
          active ? "bg-white/20" : "bg-stone-100 text-stone-500"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

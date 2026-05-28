"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { RFPResponse, updateRFP } from "@/lib/api";
import { useToast } from "@/lib/toast";
import { useConfetti } from "@/components/confetti";

type Status = RFPResponse["tender_status"];

const COLUMNS: { id: Status; label: string; labelAr: string; tone: string; bar: string }[] = [
  {
    id: "draft",
    label: "Draft",
    labelAr: "مسودة",
    tone: "bg-stone-100 dark:bg-stone-800/60 text-stone-700 dark:text-stone-300",
    bar: "bg-stone-400",
  },
  {
    id: "in_progress",
    label: "In Progress",
    labelAr: "قيد التحضير",
    tone: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    bar: "bg-blue-500",
  },
  {
    id: "submitted",
    label: "Submitted",
    labelAr: "مُقدّم",
    tone: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
    bar: "bg-amber-500",
  },
  {
    id: "won",
    label: "Won",
    labelAr: "فائز",
    tone: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
    bar: "bg-emerald-500",
  },
  {
    id: "lost",
    label: "Lost",
    labelAr: "خسر",
    tone: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300",
    bar: "bg-red-500",
  },
];

export function KanbanBoard({
  rfps,
  onChange,
}: {
  rfps: RFPResponse[];
  onChange: (updated: RFPResponse) => void;
}) {
  const { show } = useToast();
  const { fire: fireConfetti } = useConfetti();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<Status | null>(null);

  const byColumn = useMemo(() => {
    const map: Record<Status, RFPResponse[]> = {
      draft: [],
      in_progress: [],
      submitted: [],
      won: [],
      lost: [],
    };
    for (const r of rfps) {
      map[r.tender_status]?.push(r);
    }
    return map;
  }, [rfps]);

  const handleDrop = async (status: Status) => {
    if (!draggedId) return;
    const rfp = rfps.find((r) => r.id === draggedId);
    if (!rfp || rfp.tender_status === status) {
      setDraggedId(null);
      setOverColumn(null);
      return;
    }
    try {
      const updated = await updateRFP(rfp.id, { tender_status: status });
      onChange(updated);
      if (status === "won") {
        fireConfetti({ count: 160, y: window.innerHeight / 3 });
      }
      show({
        variant: status === "won" ? "success" : "info",
        title: status === "won" ? "🎉 You won!" : "Status updated",
        message:
          status === "won"
            ? `"${rfp.title || rfp.filename}" added SAR ${((rfp.estimated_value_sar || 0) / 1_000_000).toFixed(1)}M to your won pile.`
            : `"${rfp.title || rfp.filename}" → ${COLUMNS.find((c) => c.id === status)?.label}`,
      });
    } catch (err) {
      show({
        variant: "error",
        message: err instanceof Error ? err.message : "Move failed",
      });
    }
    setDraggedId(null);
    setOverColumn(null);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
      {COLUMNS.map((col) => {
        const items = byColumn[col.id] ?? [];
        const colValue = items.reduce(
          (s, r) => s + (r.estimated_value_sar ?? 0),
          0
        );
        const isOver = overColumn === col.id && draggedId !== null;
        return (
          <div
            key={col.id}
            onDragOver={(e) => {
              e.preventDefault();
              setOverColumn(col.id);
            }}
            onDragLeave={() => {
              setOverColumn((prev) => (prev === col.id ? null : prev));
            }}
            onDrop={() => handleDrop(col.id)}
            className={`flex flex-col rounded-2xl ring-1 transition-all min-h-[400px] ${
              isOver
                ? "ring-emerald-400 dark:ring-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20 shadow-elev-3 scale-[1.01]"
                : "ring-stone-200 dark:ring-stone-800 bg-white dark:bg-stone-900"
            }`}
          >
            {/* Column header */}
            <div className="p-3 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-1.5 h-1.5 rounded-full ${col.bar}`} />
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300">
                  {col.label}
                </p>
                <span className="ml-auto text-[10px] font-mono font-bold text-stone-400 dark:text-stone-500 tabular-nums">
                  {items.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-stone-400 dark:text-stone-500" dir="rtl">
                  {col.labelAr}
                </p>
                {colValue > 0 && (
                  <p className="text-[10px] font-semibold text-stone-500 dark:text-stone-400 tabular-nums">
                    SAR {(colValue / 1_000_000).toFixed(1)}M
                  </p>
                )}
              </div>
            </div>

            {/* Cards */}
            <div className="p-2.5 flex-1 space-y-2 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex items-center justify-center h-24 rounded-lg border-2 border-dashed border-stone-200 dark:border-stone-800 text-[10px] text-stone-400 dark:text-stone-600 text-center px-3">
                  Drop tenders here
                </div>
              ) : (
                items.map((rfp) => (
                  <KanbanCard
                    key={rfp.id}
                    rfp={rfp}
                    dragging={draggedId === rfp.id}
                    onDragStart={() => setDraggedId(rfp.id)}
                    onDragEnd={() => {
                      setDraggedId(null);
                      setOverColumn(null);
                    }}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({
  rfp,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  rfp: RFPResponse;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const deadline = rfp.submission_deadline
    ? new Date(rfp.submission_deadline)
    : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = deadline
    ? Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const urgencyPill =
    daysLeft === null
      ? null
      : daysLeft < 0
      ? { label: "Past deadline", tone: "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400" }
      : daysLeft === 0
      ? { label: "Due today", tone: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" }
      : daysLeft <= 3
      ? { label: `${daysLeft}d left`, tone: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300" }
      : daysLeft <= 7
      ? { label: `${daysLeft}d left`, tone: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" }
      : daysLeft <= 21
      ? { label: `${daysLeft}d left`, tone: "bg-stone-50 text-stone-600 dark:bg-stone-800/60 dark:text-stone-400" }
      : { label: `${daysLeft}d left`, tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" };

  return (
    <Link
      href={`/rfp/${rfp.id}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={`block p-3 rounded-xl bg-white dark:bg-stone-800 ring-1 ring-stone-200 dark:ring-stone-700 hover:ring-emerald-300 dark:hover:ring-emerald-700 hover:shadow-elev-2 cursor-grab active:cursor-grabbing transition-all ${
        dragging ? "opacity-40 scale-95 rotate-1" : "opacity-100"
      }`}
    >
      <p className="text-xs font-bold text-stone-900 dark:text-stone-100 leading-snug line-clamp-2">
        {rfp.title || rfp.filename}
      </p>
      {rfp.buyer && (
        <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-1 truncate">
          {rfp.buyer}
        </p>
      )}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        {rfp.estimated_value_sar ? (
          <span className="text-[10px] font-bold text-stone-700 dark:text-stone-300 tabular-nums">
            SAR {(rfp.estimated_value_sar / 1_000_000).toFixed(1)}M
          </span>
        ) : (
          <span />
        )}
        {urgencyPill && (
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${urgencyPill.tone}`}>
            {urgencyPill.label}
          </span>
        )}
      </div>
      {rfp.requirement_count > 0 && (
        <div className="mt-2 flex items-center gap-1 text-[9px] text-stone-400 dark:text-stone-500">
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span>{rfp.requirement_count} requirements</span>
        </div>
      )}
    </Link>
  );
}

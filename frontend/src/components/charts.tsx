"use client";

import { useMemo } from "react";

// ─── Donut chart (for win rate) ───────────────────────

export function DonutChart({
  value,
  total,
  size = 160,
  strokeWidth = 14,
  color = "#047857",
  trackColor = "#f5f5f4",
  label,
  sublabel,
}: {
  value: number;
  total: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  sublabel?: string;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        style={{ overflow: "visible" }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: "stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
          {pct}%
        </div>
        {label && (
          <div className="text-xs font-medium text-stone-500 dark:text-stone-400 mt-0.5">
            {label}
          </div>
        )}
        {sublabel && (
          <div className="text-[10px] text-stone-400 mt-0.5">{sublabel}</div>
        )}
      </div>
    </div>
  );
}

// ─── Bar chart (time series) ──────────────────────────

export interface BarDataPoint {
  label: string;
  submissions: number;
  wins: number;
}

export function StackedBarChart({
  data,
  height = 200,
}: {
  data: BarDataPoint[];
  height?: number;
}) {
  const maxValue = useMemo(() => {
    const max = Math.max(...data.map((d) => d.submissions), 1);
    return Math.max(max, 5);
  }, [data]);

  return (
    <div className="w-full">
      <div
        className="flex items-end gap-2 w-full"
        style={{ height: `${height}px` }}
      >
        {data.map((d, i) => {
          const submitHeight = (d.submissions / maxValue) * (height - 24);
          const winHeight = d.submissions > 0
            ? (d.wins / d.submissions) * submitHeight
            : 0;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end gap-1 group"
            >
              <div
                className="text-[10px] font-semibold text-stone-700 dark:text-stone-300 tabular-nums opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ height: "16px" }}
              >
                {d.submissions}
                {d.wins > 0 && (
                  <span className="text-emerald-600 dark:text-emerald-400 ml-1">
                    · {d.wins}W
                  </span>
                )}
              </div>
              <div
                className="w-full bg-stone-200 dark:bg-stone-700 rounded-t-md relative overflow-hidden group-hover:bg-stone-300 dark:group-hover:bg-stone-600 transition-colors"
                style={{
                  height: `${submitHeight}px`,
                  transition: "height 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                <div
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-700 to-emerald-500 rounded-t-md"
                  style={{
                    height: `${winHeight}px`,
                    transition: "height 1s cubic-bezier(0.16, 1, 0.3, 1) 0.2s",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 mt-2">
        {data.map((d, i) => (
          <div
            key={i}
            className="flex-1 text-center text-[10px] text-stone-400 dark:text-stone-500 tabular-nums"
          >
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Funnel ───────────────────────────────────────────

export interface FunnelStage {
  label: string;
  labelAr: string;
  count: number;
  value?: number;
}

export function ConversionFunnel({ stages }: { stages: FunnelStage[] }) {
  const max = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="space-y-3">
      {stages.map((stage, i) => {
        const widthPct = (stage.count / max) * 100;
        const nextStage = stages[i + 1];
        const conversion =
          nextStage && stage.count > 0
            ? Math.round((nextStage.count / stage.count) * 100)
            : null;

        const colors = [
          "from-stone-400 to-stone-500",
          "from-blue-500 to-blue-700",
          "from-amber-500 to-amber-700",
          "from-emerald-500 to-emerald-700",
        ];
        const colorClass = colors[i] ?? colors[0];

        return (
          <div key={i}>
            <div className="flex items-baseline justify-between mb-1.5">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  {stage.label}
                </span>
                <span
                  className="text-xs text-stone-400 dark:text-stone-500"
                  dir="rtl"
                >
                  {stage.labelAr}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                {stage.value !== undefined && stage.value > 0 && (
                  <span className="text-xs text-stone-500 dark:text-stone-400">
                    SAR {(stage.value / 1000000).toFixed(1)}M
                  </span>
                )}
                <span className="text-lg font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                  {stage.count}
                </span>
              </div>
            </div>
            <div className="relative">
              <div className="h-3 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${colorClass} rounded-full`}
                  style={{
                    width: `${widthPct}%`,
                    transition: "width 1s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                />
              </div>
              {conversion !== null && (
                <div className="absolute -bottom-1 right-0 translate-y-full">
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-stone-500 dark:text-stone-400 mt-1">
                    <svg
                      className="w-2.5 h-2.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                      />
                    </svg>
                    {conversion}% conversion
                  </span>
                </div>
              )}
            </div>
            {conversion !== null && <div className="h-3" />}
          </div>
        );
      })}
    </div>
  );
}

// ─── Sparkline ────────────────────────────────────────

export function Sparkline({
  data,
  color = "#047857",
  height = 32,
  className = "",
}: {
  data: number[];
  color?: string;
  height?: number;
  className?: string;
}) {
  if (data.length < 2) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 100;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
    >
      <defs>
        <linearGradient id="sparkline-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <polygon
        fill="url(#sparkline-fill)"
        points={`0,${height} ${points} ${width},${height}`}
      />
    </svg>
  );
}

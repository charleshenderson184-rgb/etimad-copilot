"use client";

import { useEffect, useState } from "react";
import {
  createReview,
  deleteReview,
  listReviews,
  ProposalReview,
  TeamColor,
  updateReview,
} from "@/lib/api";
import { useToast } from "@/lib/toast";

interface TeamMeta {
  color: TeamColor;
  label: string;
  labelAr: string;
  phase: string;
  blurb: string;
  rubric: { key: string; label: string; help: string }[];
  recommendations: { value: string; label: string; tone: "positive" | "neutral" | "negative" }[];
  swatch: { bg: string; ring: string; dot: string; text: string };
  showWinProbability?: boolean;
}

const TEAMS: TeamMeta[] = [
  {
    color: "blue",
    label: "Blue Team",
    labelAr: "الفريق الأزرق",
    phase: "Strategy validation",
    blurb: "Pre-RFP review: validate capture plan and bid/no-bid decision before drafting begins.",
    rubric: [
      { key: "buyer_understanding", label: "Buyer understanding", help: "Do we understand the buyer's priorities, pressures, and decision criteria?" },
      { key: "win_strategy", label: "Win strategy clarity", help: "Is our path to win specific, defensible, and matched to scoring weights?" },
      { key: "competitive_position", label: "Competitive position", help: "Where do we beat / lose to likely competitors?" },
      { key: "bid_readiness", label: "Bid readiness", help: "Do we have the team, content, and time to execute well?" },
    ],
    recommendations: [
      { value: "bid", label: "Bid", tone: "positive" },
      { value: "bid_with_changes", label: "Bid with changes", tone: "neutral" },
      { value: "no_bid", label: "No bid", tone: "negative" },
    ],
    swatch: {
      bg: "from-blue-500/15 to-blue-700/5",
      ring: "ring-blue-300/50 dark:ring-blue-800/60",
      dot: "bg-blue-500",
      text: "text-blue-700 dark:text-blue-300",
    },
  },
  {
    color: "pink",
    label: "Pink Team",
    labelAr: "الفريق الوردي",
    phase: "First-draft review",
    blurb: "Early structural review — compliance coverage and content gaps while changes are cheap.",
    rubric: [
      { key: "compliance_coverage", label: "Compliance coverage", help: "Every mandatory requirement addressed?" },
      { key: "structure_clarity", label: "Structure & clarity", help: "Is the proposal easy to navigate for evaluators?" },
      { key: "win_themes_present", label: "Win themes woven in", help: "Are our themes visible throughout each section?" },
      { key: "section_quality", label: "Section quality", help: "Are individual sections substantive (not placeholder)?" },
    ],
    recommendations: [
      { value: "passed", label: "Move to drafting", tone: "positive" },
      { value: "needs_revision", label: "Needs revision", tone: "neutral" },
      { value: "blocked", label: "Blocked", tone: "negative" },
    ],
    swatch: {
      bg: "from-pink-500/15 to-pink-700/5",
      ring: "ring-pink-300/50 dark:ring-pink-800/60",
      dot: "bg-pink-500",
      text: "text-pink-700 dark:text-pink-300",
    },
  },
  {
    color: "red",
    label: "Red Team",
    labelAr: "الفريق الأحمر",
    phase: "Adversarial review",
    blurb: "Score the proposal as the evaluator would. Highest-leverage review — gaps caught here often decide the win.",
    rubric: [
      { key: "persuasiveness", label: "Persuasiveness", help: "Does this convince a skeptical evaluator?" },
      { key: "discriminator_strength", label: "Discriminator strength", help: "Are we clearly differentiated, or interchangeable with competitors?" },
      { key: "evidence_quality", label: "Evidence quality", help: "Past performance, certifications, references — credible?" },
      { key: "predicted_score", label: "Predicted scoring", help: "If you were the evaluator scoring this against the RFP criteria, what would you give?" },
    ],
    recommendations: [
      { value: "submit", label: "Submit as-is", tone: "positive" },
      { value: "rework", label: "Rework required", tone: "neutral" },
      { value: "withdraw", label: "Withdraw", tone: "negative" },
    ],
    swatch: {
      bg: "from-red-500/15 to-red-700/5",
      ring: "ring-red-300/50 dark:ring-red-800/60",
      dot: "bg-red-500",
      text: "text-red-700 dark:text-red-300",
    },
    showWinProbability: true,
  },
  {
    color: "gold",
    label: "Gold Team",
    labelAr: "الفريق الذهبي",
    phase: "Executive sign-off",
    blurb: "Final go/no-go from leadership. Confirms commercial terms, pricing competitiveness, and strategic fit.",
    rubric: [
      { key: "pricing_competitive", label: "Pricing competitiveness", help: "Will this win on price without margin destruction?" },
      { key: "risk_acceptable", label: "Risk acceptable", help: "Delivery, financial, and reputational risk understood and accepted?" },
      { key: "strategic_fit", label: "Strategic fit", help: "Does this win advance our overall portfolio strategy?" },
      { key: "delivery_confidence", label: "Delivery confidence", help: "Can we deliver what we're promising, on-time, in-budget?" },
    ],
    recommendations: [
      { value: "go", label: "Submit (Go)", tone: "positive" },
      { value: "hold", label: "Hold", tone: "neutral" },
      { value: "rework", label: "Rework", tone: "negative" },
    ],
    swatch: {
      bg: "from-amber-400/15 to-amber-700/5",
      ring: "ring-amber-300/50 dark:ring-amber-800/60",
      dot: "bg-amber-500",
      text: "text-amber-700 dark:text-amber-300",
    },
  },
];

export function ColorTeamReviews({ proposalId }: { proposalId: string }) {
  const { show } = useToast();
  const [reviews, setReviews] = useState<ProposalReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTeam, setActiveTeam] = useState<TeamColor | null>(null);

  useEffect(() => {
    listReviews(proposalId)
      .then(setReviews)
      .finally(() => setLoading(false));
  }, [proposalId]);

  const getReview = (color: TeamColor) =>
    reviews.find((r) => r.team_color === color);

  // Sequential gating — only allow starting the next team after the previous passes
  const isUnlocked = (idx: number) => {
    if (idx === 0) return true;
    const prev = getReview(TEAMS[idx - 1].color);
    return prev?.status === "passed";
  };

  const passedCount = reviews.filter((r) => r.status === "passed").length;
  const progressPct = (passedCount / 4) * 100;

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-48 rounded-2xl bg-stone-100 dark:bg-stone-800 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-baseline justify-between mb-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400 mb-1">
              Color Team Reviews
            </p>
            <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
              Bid review gates
            </h3>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-stone-900 dark:text-stone-100 tabular-nums">
              {passedCount}<span className="text-stone-400 dark:text-stone-500">/4</span>
            </div>
            <div className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400">
              gates passed
            </div>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-700 rounded-full"
            style={{
              width: `${progressPct}%`,
              transition: "width 1s var(--ease-out-expo)",
            }}
          />
        </div>
      </div>

      {/* Team cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        {TEAMS.map((team, idx) => {
          const review = getReview(team.color);
          const unlocked = isUnlocked(idx);
          return (
            <TeamCard
              key={team.color}
              team={team}
              review={review}
              unlocked={unlocked}
              stageNumber={idx + 1}
              onClick={() => unlocked && setActiveTeam(team.color)}
            />
          );
        })}
      </div>

      {activeTeam && (
        <ReviewModal
          team={TEAMS.find((t) => t.color === activeTeam)!}
          review={getReview(activeTeam)}
          onClose={() => setActiveTeam(null)}
          onSave={async (payload) => {
            try {
              const existing = getReview(activeTeam);
              const updated = existing
                ? await updateReview(proposalId, existing.id, payload)
                : await createReview(proposalId, { ...payload, team_color: activeTeam });
              setReviews((prev) => {
                const others = prev.filter((r) => r.id !== updated.id);
                return [...others, updated];
              });
              show({
                variant: payload.status === "passed" ? "success" : "info",
                title: `${TEAMS.find((t) => t.color === activeTeam)?.label} saved`,
                message:
                  payload.status === "passed"
                    ? "Gate passed — next team unlocked."
                    : "Review notes saved.",
              });
              setActiveTeam(null);
            } catch (err) {
              show({
                variant: "error",
                message: err instanceof Error ? err.message : "Save failed",
              });
            }
          }}
          onDelete={async () => {
            const existing = getReview(activeTeam);
            if (!existing) return;
            if (!confirm("Reset this review? All scores will be lost.")) return;
            try {
              await deleteReview(proposalId, existing.id);
              setReviews((prev) => prev.filter((r) => r.id !== existing.id));
              setActiveTeam(null);
              show({ variant: "info", message: "Review reset." });
            } catch (err) {
              show({
                variant: "error",
                message: err instanceof Error ? err.message : "Reset failed",
              });
            }
          }}
        />
      )}
    </div>
  );
}

function TeamCard({
  team,
  review,
  unlocked,
  stageNumber,
  onClick,
}: {
  team: TeamMeta;
  review: ProposalReview | undefined;
  unlocked: boolean;
  stageNumber: number;
  onClick: () => void;
}) {
  const status = review?.status ?? "not_started";
  const statusLabel = {
    not_started: "Not started",
    in_progress: "In progress",
    passed: "Passed",
    failed: "Failed",
  }[status];

  return (
    <button
      onClick={onClick}
      disabled={!unlocked}
      className={`
        relative text-left p-5 rounded-2xl ring-1 overflow-hidden transition-all
        ${unlocked
          ? `bg-gradient-to-br ${team.swatch.bg} bg-white dark:bg-stone-900 ${team.swatch.ring} hover:shadow-elev-3 hover:-translate-y-0.5 cursor-pointer`
          : "bg-stone-50 dark:bg-stone-900/40 ring-stone-200 dark:ring-stone-800 opacity-50 cursor-not-allowed"}
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${team.swatch.dot}`} />
          <span className={`text-[10px] font-mono font-bold tracking-wider ${team.swatch.text}`}>
            GATE {stageNumber}
          </span>
        </div>
        {!unlocked && (
          <svg className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )}
        {status === "passed" && (
          <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        {status === "failed" && (
          <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )}
        {status === "in_progress" && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
            DRAFT
          </span>
        )}
      </div>

      <h4 className="font-bold text-stone-900 dark:text-stone-100 text-base tracking-tight">
        {team.label}
      </h4>
      <p className={`text-[10px] mt-0.5 ${team.swatch.text} font-medium`} dir="rtl">
        {team.labelAr}
      </p>
      <p className={`text-[10px] uppercase tracking-wider ${team.swatch.text} mt-1.5 font-semibold`}>
        {team.phase}
      </p>
      <p className="text-xs text-stone-600 dark:text-stone-400 mt-2 leading-relaxed">
        {team.blurb}
      </p>

      <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[10px]">
        <span className="text-stone-500 dark:text-stone-400 uppercase tracking-wider font-semibold">
          {statusLabel}
        </span>
        {review?.overall_score !== null && review?.overall_score !== undefined && (
          <span className="font-bold text-stone-900 dark:text-stone-100 tabular-nums">
            {review.overall_score.toFixed(1)}/5
          </span>
        )}
        {team.showWinProbability && review?.win_probability !== null && review?.win_probability !== undefined && (
          <span className={`font-bold tabular-nums ${review.win_probability >= 60 ? "text-emerald-700 dark:text-emerald-300" : review.win_probability >= 35 ? "text-amber-700 dark:text-amber-300" : "text-red-700 dark:text-red-300"}`}>
            {review.win_probability}% pWin
          </span>
        )}
      </div>
    </button>
  );
}

function ReviewModal({
  team,
  review,
  onClose,
  onSave,
  onDelete,
}: {
  team: TeamMeta;
  review: ProposalReview | undefined;
  onClose: () => void;
  onSave: (payload: Partial<{
    team_color: TeamColor;
    reviewer_name: string;
    scores: string;
    notes: string;
    recommendation: string;
    win_probability: number;
    status: "not_started" | "in_progress" | "passed" | "failed";
  }>) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const parseScores = (): Record<string, number> => {
    if (!review?.scores) return {};
    try {
      return JSON.parse(review.scores);
    } catch {
      return {};
    }
  };

  const [reviewer, setReviewer] = useState(review?.reviewer_name || "");
  const [scores, setScores] = useState<Record<string, number>>(parseScores());
  const [notes, setNotes] = useState(review?.notes || "");
  const [recommendation, setRecommendation] = useState(review?.recommendation || "");
  const [winProb, setWinProb] = useState<number>(review?.win_probability ?? 50);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (finalize: boolean) => {
    setSaving(true);
    await onSave({
      reviewer_name: reviewer,
      scores: JSON.stringify(scores),
      notes,
      recommendation,
      win_probability: team.showWinProbability ? winProb : undefined,
      status: finalize ? (recommendation && team.recommendations.find((r) => r.value === recommendation)?.tone === "negative" ? "failed" : "passed") : "in_progress",
    });
    setSaving(false);
  };

  const averageScore = Object.values(scores).length
    ? Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto ring-1 ring-stone-200 dark:ring-stone-800 animate-scale-in"
      >
        {/* Header */}
        <div className={`relative p-6 border-b border-stone-100 dark:border-stone-800 bg-gradient-to-br ${team.swatch.bg}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`w-2 h-2 rounded-full ${team.swatch.dot}`} />
                <span className={`text-[10px] font-mono font-bold tracking-wider ${team.swatch.text}`}>
                  GATE · {team.phase}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
                {team.label}
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5" dir="rtl">
                {team.labelAr}
              </p>
              <p className="text-sm text-stone-600 dark:text-stone-400 mt-2 max-w-md leading-relaxed">
                {team.blurb}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Reviewer */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
              Reviewer
            </label>
            <input
              type="text"
              value={reviewer}
              onChange={(e) => setReviewer(e.target.value)}
              placeholder="Your name"
              className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-800 focus:border-emerald-500"
            />
          </div>

          {/* Rubric — 5-point scale per criterion */}
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Scoring rubric · 1–5 scale
              </label>
              {averageScore > 0 && (
                <span className="text-sm font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                  Avg: {averageScore.toFixed(1)}
                </span>
              )}
            </div>
            <div className="space-y-3">
              {team.rubric.map((crit) => (
                <div key={crit.key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                        {crit.label}
                      </p>
                      <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                        {crit.help}
                      </p>
                    </div>
                    <span className={`text-base font-bold tabular-nums w-8 text-right ${scores[crit.key] >= 4 ? "text-emerald-700 dark:text-emerald-300" : scores[crit.key] >= 3 ? "text-amber-700 dark:text-amber-300" : scores[crit.key] >= 1 ? "text-red-700 dark:text-red-300" : "text-stone-300 dark:text-stone-600"}`}>
                      {scores[crit.key] ?? "—"}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() =>
                          setScores((prev) => ({ ...prev, [crit.key]: n }))
                        }
                        className={`flex-1 h-7 rounded-md text-xs font-semibold transition-all ${
                          scores[crit.key] === n
                            ? n >= 4
                              ? "bg-emerald-600 text-white shadow-sm"
                              : n >= 3
                              ? "bg-amber-500 text-white shadow-sm"
                              : "bg-red-500 text-white shadow-sm"
                            : "bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Win probability (Red team only) */}
          {team.showWinProbability && (
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Win probability estimate
                </label>
                <span className={`text-2xl font-bold tabular-nums ${winProb >= 60 ? "text-emerald-700 dark:text-emerald-300" : winProb >= 35 ? "text-amber-700 dark:text-amber-300" : "text-red-700 dark:text-red-300"}`}>
                  {winProb}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={winProb}
                onChange={(e) => setWinProb(parseInt(e.target.value))}
                className="w-full accent-emerald-600"
              />
              <div className="flex justify-between text-[10px] text-stone-400 dark:text-stone-500 mt-1 font-mono">
                <span>0% No chance</span>
                <span>50% Toss-up</span>
                <span>100% Lock</span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
              Notes & observations
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder={`What did you find? Risks, gaps, strengths…`}
              className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-800 focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Recommendation */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
              Recommendation
            </label>
            <div className="grid grid-cols-3 gap-2">
              {team.recommendations.map((rec) => (
                <button
                  key={rec.value}
                  onClick={() => setRecommendation(rec.value)}
                  className={`p-2.5 rounded-lg text-sm font-semibold transition-all ${
                    recommendation === rec.value
                      ? rec.tone === "positive"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : rec.tone === "negative"
                        ? "bg-red-600 text-white shadow-sm"
                        : "bg-amber-500 text-white shadow-sm"
                      : "bg-white dark:bg-stone-800 ring-1 ring-stone-200 dark:ring-stone-700 text-stone-700 dark:text-stone-300 hover:ring-stone-300 dark:hover:ring-stone-600"
                  }`}
                >
                  {rec.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-stone-50/80 dark:bg-stone-800/40 backdrop-blur-md p-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-3">
          <div>
            {review && (
              <button
                onClick={onDelete}
                className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium"
              >
                Reset review
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleSubmit(false)}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-white dark:bg-stone-900 ring-1 ring-stone-200 dark:ring-stone-700 text-stone-700 dark:text-stone-300 text-sm font-medium hover:ring-stone-300 disabled:opacity-50 transition-colors"
            >
              Save draft
            </button>
            <button
              onClick={() => handleSubmit(true)}
              disabled={saving || !recommendation}
              className="px-5 py-2 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-800 text-white text-sm font-semibold hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {saving ? "Saving..." : "Finalize gate"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface TourStep {
  id: string;
  title: string;
  body: string;
  targetSelector?: string;       // CSS selector for the element to highlight
  href?: string;                  // Navigate before showing this step
  align?: "top" | "bottom" | "center";
  cta?: string;                   // Custom Next-button label
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Etimad Copilot 👋",
    body: "Let's take 60 seconds to show you how to win more tenders. You can skip anytime.",
    align: "center",
    cta: "Show me around",
  },
  {
    id: "discover",
    title: "1. Discover matched tenders",
    body: "Every active Etimad tender, ranked by fit against your profile. Daily refresh. Strong matches highlighted in emerald.",
    href: "/discover",
    targetSelector: "[data-tour='discover-feed']",
    align: "bottom",
  },
  {
    id: "match-score",
    title: "Each tender shows a match score",
    body: "We score industry fit, LCGPA clearance, deadline workability, and team-size match. 70+ is a strong fit. Click any tender to see why.",
    href: "/discover",
    targetSelector: "[data-tour='tender-card']:first-of-type",
    align: "bottom",
  },
  {
    id: "pipeline",
    title: "2. Manage your pipeline",
    body: "Tenders you pursue land here. Track every bid from Draft → Submitted → Won/Lost. Calendar shows upcoming deadlines.",
    href: "/dashboard",
    targetSelector: "[data-tour='pipeline-stats']",
    align: "bottom",
  },
  {
    id: "profile",
    title: "3. Train it on your wins",
    body: "Upload past proposals, capability statements, and CVs. The platform drafts new proposals in your company's voice.",
    href: "/profile",
    targetSelector: "[data-tour='profile-form']",
    align: "bottom",
  },
  {
    id: "analytics",
    title: "4. Prove the ROI to your board",
    body: "Win-rate analytics, top buyers, pipeline funnel, and a real-time ROI calculator. Built for the quarterly board update.",
    href: "/analytics",
    targetSelector: "[data-tour='analytics-roi']",
    align: "bottom",
  },
  {
    id: "done",
    title: "You're set 🎉",
    body: "Now go upload your first RFP — see your full compliance matrix in 30 seconds.",
    align: "center",
    cta: "Take me to Discover",
  },
];

interface TourContextValue {
  start: () => void;
  stop: () => void;
  isActive: boolean;
}

const TourContext = createContext<TourContextValue | null>(null);

const STORAGE_KEY = "etimad_tour_completed";

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const start = useCallback(() => {
    setStepIndex(0);
    setIsActive(true);
  }, []);

  const stop = useCallback(() => {
    setIsActive(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "1");
    }
  }, []);

  const next = useCallback(() => {
    if (stepIndex >= TOUR_STEPS.length - 1) {
      stop();
      if (typeof window !== "undefined") {
        window.location.href = "/discover";
      }
      return;
    }
    const upcoming = TOUR_STEPS[stepIndex + 1];
    if (upcoming.href && typeof window !== "undefined" && window.location.pathname !== upcoming.href) {
      // Persist progress, navigate, resume from next step
      sessionStorage.setItem("etimad_tour_step", String(stepIndex + 1));
      window.location.href = upcoming.href;
      return;
    }
    setStepIndex(stepIndex + 1);
  }, [stepIndex, stop]);

  const back = useCallback(() => {
    if (stepIndex === 0) return;
    setStepIndex(stepIndex - 1);
  }, [stepIndex]);

  // Resume on navigation
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = sessionStorage.getItem("etimad_tour_step");
    if (saved !== null) {
      const idx = parseInt(saved);
      if (!isNaN(idx) && idx >= 0 && idx < TOUR_STEPS.length) {
        setStepIndex(idx);
        setIsActive(true);
      }
      sessionStorage.removeItem("etimad_tour_step");
    }
  }, []);

  return (
    <TourContext.Provider value={{ start, stop, isActive }}>
      {children}
      {isActive && (
        <TourOverlay
          step={TOUR_STEPS[stepIndex]}
          stepIndex={stepIndex}
          totalSteps={TOUR_STEPS.length}
          onNext={next}
          onBack={back}
          onSkip={stop}
        />
      )}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used inside <TourProvider>");
  return ctx;
}

/** Auto-starts the tour for new users (no localStorage flag). */
export function TourAutoStarter() {
  const { start, isActive } = useTour();
  useEffect(() => {
    if (isActive) return;
    if (typeof window === "undefined") return;
    // If there's a pending resume step, TourProvider will handle it — don't double-start.
    if (sessionStorage.getItem("etimad_tour_step") !== null) return;
    const completed = localStorage.getItem(STORAGE_KEY);
    const startedFlag = sessionStorage.getItem("etimad_tour_started");
    if (!completed && !startedFlag) {
      sessionStorage.setItem("etimad_tour_started", "1");
      const t = setTimeout(() => start(), 600);
      return () => clearTimeout(t);
    }
  }, [start, isActive]);
  return null;
}

// ─── Overlay UI ────────────────────────────────────────

function TourOverlay({
  step,
  stepIndex,
  totalSteps,
  onNext,
  onBack,
  onSkip,
}: {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!step.targetSelector) {
      setTargetRect(null);
      return;
    }
    const update = () => {
      const el = document.querySelector(step.targetSelector!);
      if (el instanceof HTMLElement) {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
        // Auto-scroll into view if needed
        const scrolledOff =
          rect.top < 80 || rect.bottom > window.innerHeight - 80;
        if (scrolledOff) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } else {
        setTargetRect(null);
      }
    };
    update();
    const t = setTimeout(update, 200); // Re-query after potential layout settle
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
  }, [step.targetSelector]);

  const tooltipStyle = computeTooltipPosition(targetRect, step.align);

  return (
    <div className="fixed inset-0 z-[90] pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 pointer-events-auto bg-stone-950/60 backdrop-blur-[2px]" onClick={onSkip} />

      {/* Highlight ring around target */}
      {targetRect && (
        <div
          className="absolute pointer-events-none transition-all duration-500"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            boxShadow:
              "0 0 0 9999px rgba(12, 10, 9, 0.7), 0 0 0 4px rgba(16, 185, 129, 0.6), 0 0 60px 8px rgba(16, 185, 129, 0.4)",
            borderRadius: 12,
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className="absolute pointer-events-auto animate-scale-in"
        style={tooltipStyle}
      >
        <div className="bg-white dark:bg-stone-900 rounded-2xl ring-1 ring-stone-200 dark:ring-stone-700 shadow-elev-4 p-6 max-w-sm">
          {/* Progress dots */}
          <div className="flex items-center gap-1 mb-4">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all ${
                  i === stepIndex
                    ? "w-8 bg-emerald-600"
                    : i < stepIndex
                    ? "w-2 bg-emerald-600/50"
                    : "w-2 bg-stone-200 dark:bg-stone-700"
                }`}
              />
            ))}
            <span className="ml-auto text-[10px] font-mono font-bold text-stone-400 dark:text-stone-500">
              {stepIndex + 1}/{totalSteps}
            </span>
          </div>

          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 tracking-tight mb-2">
            {step.title}
          </h3>
          <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
            {step.body}
          </p>

          <div className="mt-5 flex items-center justify-between gap-2">
            <button
              onClick={onSkip}
              className="text-xs text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 font-medium transition-colors"
            >
              Skip tour
            </button>
            <div className="flex items-center gap-2">
              {stepIndex > 0 && (
                <button
                  onClick={onBack}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={onNext}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-800 text-white text-xs font-semibold hover:shadow-md transition-all"
              >
                {step.cta ?? "Next"}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function computeTooltipPosition(
  rect: DOMRect | null,
  align: TourStep["align"] = "bottom"
): React.CSSProperties {
  if (!rect || align === "center") {
    return {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    };
  }

  const PAD = 16;
  const tooltipWidth = 384;
  const tooltipHeight = 220;

  // Default — below the target
  let top = rect.bottom + PAD;
  let left = rect.left + rect.width / 2 - tooltipWidth / 2;

  if (align === "top") {
    top = rect.top - tooltipHeight - PAD;
  }

  // Clamp to viewport
  if (typeof window !== "undefined") {
    if (left < PAD) left = PAD;
    if (left + tooltipWidth > window.innerWidth - PAD) {
      left = window.innerWidth - tooltipWidth - PAD;
    }
    if (top < PAD) top = PAD;
    if (top + tooltipHeight > window.innerHeight - PAD) {
      top = window.innerHeight - tooltipHeight - PAD;
    }
  }

  return { top, left, width: tooltipWidth };
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface Toast {
  id: number;
  variant: ToastVariant;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  show: (toast: Omit<Toast, "id">) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = ++counter;
      const duration = toast.duration ?? 4000;
      setToasts((prev) => [...prev, { ...toast, id }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toasts, show, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const VARIANT_STYLES: Record<
  ToastVariant,
  { ring: string; bg: string; icon: React.ReactNode; iconBg: string }
> = {
  success: {
    ring: "ring-emerald-200",
    bg: "bg-white",
    iconBg: "bg-emerald-100 text-emerald-700",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
        d="M5 13l4 4L19 7"
      />
    ),
  },
  error: {
    ring: "ring-red-200",
    bg: "bg-white",
    iconBg: "bg-red-100 text-red-700",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
  info: {
    ring: "ring-blue-200",
    bg: "bg-white",
    iconBg: "bg-blue-100 text-blue-700",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
  warning: {
    ring: "ring-amber-200",
    bg: "bg-white",
    iconBg: "bg-amber-100 text-amber-700",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    ),
  },
};

function ToastViewport({
  toasts,
  dismiss,
}: {
  toasts: Toast[];
  dismiss: (id: number) => void;
}) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const [leaving, setLeaving] = useState(false);
  const style = VARIANT_STYLES[toast.variant];

  useEffect(() => {
    if (!toast.duration || toast.duration <= 0) return;
    const t = setTimeout(() => setLeaving(true), toast.duration - 250);
    return () => clearTimeout(t);
  }, [toast.duration]);

  return (
    <div
      className={`
        pointer-events-auto
        ${style.bg} ${style.ring} ring-1 shadow-lg rounded-xl
        flex items-start gap-3 p-3.5 pr-2
        ${leaving ? "opacity-0 translate-x-3" : "opacity-100 translate-x-0"}
        transition-all duration-300 ease-out animate-fade-in-down
      `}
    >
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-lg ${style.iconBg} flex items-center justify-center`}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {style.icon}
        </svg>
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        {toast.title && (
          <p className="text-sm font-semibold text-stone-900 leading-tight">
            {toast.title}
          </p>
        )}
        <p
          className={`text-sm text-stone-600 leading-snug ${
            toast.title ? "mt-0.5" : ""
          }`}
        >
          {toast.message}
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 p-1 rounded-md text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-colors"
        aria-label="Dismiss"
      >
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
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}

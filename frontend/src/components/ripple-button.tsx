"use client";

import { useRef } from "react";

interface RippleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function RippleButton({
  children,
  variant = "primary",
  size = "md",
  className = "",
  onClick,
  ...rest
}: RippleButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    const btn = ref.current;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      btn.style.setProperty("--ripple-x", `${e.clientX - rect.left}px`);
      btn.style.setProperty("--ripple-y", `${e.clientY - rect.top}px`);
      btn.classList.remove("is-rippling");
      // Force reflow to restart animation
      void btn.offsetWidth;
      btn.classList.add("is-rippling");
    }
    onClick?.(e);
  }

  const variantClasses = {
    primary:
      "bg-gradient-to-br from-emerald-600 to-emerald-800 text-white shadow-emerald hover:from-emerald-500 hover:to-emerald-700 hover:shadow-elev-3",
    secondary:
      "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 ring-1 ring-stone-200 dark:ring-stone-800 hover:ring-stone-300 dark:hover:ring-stone-700 shadow-elev-1 hover:shadow-elev-2",
    ghost:
      "bg-transparent text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800",
  }[variant];

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-sm",
  }[size];

  return (
    <button
      ref={ref}
      onClick={handleClick}
      className={`
        ripple btn-magnetic inline-flex items-center justify-center gap-2
        rounded-xl font-semibold tracking-tight
        transition-all duration-300 ease-out
        ${variantClasses} ${sizeClasses} ${className}
      `}
      {...rest}
    >
      {children}
    </button>
  );
}

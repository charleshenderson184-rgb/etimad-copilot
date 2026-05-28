"use client";

import { useRef } from "react";

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  gradientBorder?: boolean;
}

export function SpotlightCard({
  children,
  className = "",
  gradientBorder = false,
  ...rest
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={`spotlight ${gradientBorder ? "gradient-border" : ""} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

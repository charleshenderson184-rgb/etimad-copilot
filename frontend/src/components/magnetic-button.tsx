"use client";

import React, { useRef } from "react";

interface MagneticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}

export function MagneticButton({
  children,
  className = "",
  strength = 18,
  ...rest
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLButtonElement>) {
    const btn = ref.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const mx = ((x - rect.width / 2) / rect.width) * strength;
    const my = ((y - rect.height / 2) / rect.height) * strength;
    btn.style.transform = `translate(${mx}px, ${my}px)`;
    btn.style.setProperty("--mx", `${(x / rect.width) * 100}%`);
    btn.style.setProperty("--my", `${(y / rect.height) * 100}%`);
  }

  function handleMouseLeave() {
    const btn = ref.current;
    if (!btn) return;
    btn.style.transform = "translate(0, 0)";
  }

  return (
    <button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`btn-magnetic ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

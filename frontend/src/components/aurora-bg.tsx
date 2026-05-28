"use client";

export function AuroraBackground({ intensity = "medium" }: { intensity?: "low" | "medium" | "high" }) {
  // Reduced — was washing out hero text. Now tasteful.
  const opacity = intensity === "low" ? 0.15 : intensity === "high" ? 0.4 : 0.25;
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="aurora-blob aurora-1"
        style={{
          top: "-15%",
          left: "-10%",
          width: "45vw",
          height: "45vw",
          background:
            "radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, rgba(16, 185, 129, 0) 70%)",
          opacity,
        }}
      />
      <div
        className="aurora-blob aurora-2"
        style={{
          top: "5%",
          right: "-15%",
          width: "40vw",
          height: "40vw",
          background:
            "radial-gradient(circle, rgba(6, 95, 70, 0.22) 0%, rgba(6, 95, 70, 0) 70%)",
          opacity: opacity * 0.85,
          animationDelay: "-7s",
        }}
      />
      <div
        className="aurora-blob aurora-3"
        style={{
          bottom: "-20%",
          left: "25%",
          width: "50vw",
          height: "50vw",
          background:
            "radial-gradient(circle, rgba(52, 211, 153, 0.18) 0%, rgba(52, 211, 153, 0) 70%)",
          opacity: opacity * 0.7,
          animationDelay: "-14s",
        }}
      />
    </div>
  );
}

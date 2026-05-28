"use client";

export function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div
        className="floating-orb animate-float-slow"
        style={{
          top: "10%",
          left: "5%",
          width: "300px",
          height: "300px",
          background:
            "radial-gradient(circle, rgba(6, 78, 59, 0.18) 0%, rgba(6, 78, 59, 0) 70%)",
        }}
      />
      <div
        className="floating-orb animate-float-reverse"
        style={{
          top: "30%",
          right: "10%",
          width: "400px",
          height: "400px",
          background:
            "radial-gradient(circle, rgba(120, 53, 15, 0.12) 0%, rgba(120, 53, 15, 0) 70%)",
          animationDelay: "-5s",
        }}
      />
      <div
        className="floating-orb animate-float-slow"
        style={{
          bottom: "10%",
          left: "30%",
          width: "350px",
          height: "350px",
          background:
            "radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0) 70%)",
          animationDelay: "-10s",
        }}
      />
    </div>
  );
}

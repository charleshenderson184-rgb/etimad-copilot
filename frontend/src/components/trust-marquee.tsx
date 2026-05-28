"use client";

const ITEMS = [
  { label: "Vision 2030 aligned", icon: "✦" },
  { label: "LCGPA scoring built-in", icon: "◆" },
  { label: "PDPL compliant", icon: "✦" },
  { label: "Bilingual AR / EN", icon: "◆" },
  { label: "Saudization tracking", icon: "✦" },
  { label: "Etimad-native format", icon: "◆" },
  { label: "ISO 27001 ready", icon: "✦" },
];

export function TrustMarquee() {
  return (
    <div className="relative w-full overflow-hidden py-6 border-y border-stone-200/60 bg-white/30 backdrop-blur-sm">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10"
        style={{
          background: "linear-gradient(to right, var(--background), transparent)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10"
        style={{
          background: "linear-gradient(to left, var(--background), transparent)",
        }}
      />
      <div className="flex animate-marquee whitespace-nowrap" style={{ width: "max-content" }}>
        {[...ITEMS, ...ITEMS].map((item, idx) => (
          <div
            key={idx}
            className="mx-8 inline-flex items-center gap-2.5 text-sm text-stone-500"
          >
            <span className="text-emerald-600 text-base">{item.icon}</span>
            <span className="font-medium tracking-wide">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

export function TypingIndicator({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-end gap-0.5 ${className}`}>
      <span
        className="w-1.5 h-1.5 rounded-full bg-emerald-600 typing-dot"
        style={{ animationDelay: "0s" }}
      />
      <span
        className="w-1.5 h-1.5 rounded-full bg-emerald-600 typing-dot"
        style={{ animationDelay: "0.2s" }}
      />
      <span
        className="w-1.5 h-1.5 rounded-full bg-emerald-600 typing-dot"
        style={{ animationDelay: "0.4s" }}
      />
    </div>
  );
}

export function WaveBars({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-end gap-0.5 h-4 ${className}`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="w-0.5 bg-emerald-600 wave-bar"
          style={{
            height: "100%",
            animationDelay: `${i * 0.12}s`,
          }}
        />
      ))}
    </div>
  );
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  color: string;
  size: number;
  shape: "rect" | "circle";
  life: number;
}

interface ConfettiContextValue {
  fire: (opts?: { x?: number; y?: number; count?: number }) => void;
}

const ConfettiContext = createContext<ConfettiContextValue | null>(null);

const COLORS = [
  "#10b981", // emerald-500
  "#34d399", // emerald-400
  "#6ee7b7", // emerald-300
  "#047857", // emerald-700
  "#facc15", // gold-400
  "#ffffff",
];

const GRAVITY = 0.32;
const DRAG = 0.985;
const TERMINAL = 16;

export function ConfettiProvider({ children }: { children: React.ReactNode }) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const rafRef = useRef<number | null>(null);
  const idRef = useRef(0);

  const tick = useCallback(() => {
    setParticles((prev) => {
      if (prev.length === 0) return prev;
      const next = prev
        .map((p) => {
          const vy = Math.min(TERMINAL, (p.vy + GRAVITY) * DRAG);
          return {
            ...p,
            x: p.x + p.vx,
            y: p.y + vy,
            vx: p.vx * DRAG,
            vy,
            rot: p.rot + p.vrot,
            life: p.life - 1,
          };
        })
        .filter((p) => p.life > 0 && p.y < window.innerHeight + 60);
      return next;
    });
  }, []);

  useEffect(() => {
    if (particles.length === 0) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    const loop = () => {
      tick();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [particles.length, tick]);

  const fire = useCallback<ConfettiContextValue["fire"]>(
    (opts = {}) => {
      const count = opts.count ?? 120;
      const x = opts.x ?? window.innerWidth / 2;
      const y = opts.y ?? window.innerHeight / 3;

      const newOnes: Particle[] = [];
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const power = 6 + Math.random() * 10;
        newOnes.push({
          id: idRef.current++,
          x,
          y,
          vx: Math.cos(angle) * power,
          vy: Math.sin(angle) * power - 6, // bias upward
          rot: Math.random() * 360,
          vrot: (Math.random() - 0.5) * 20,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: 6 + Math.random() * 7,
          shape: Math.random() > 0.5 ? "rect" : "circle",
          life: 80 + Math.random() * 40,
        });
      }
      setParticles((prev) => [...prev, ...newOnes]);
    },
    []
  );

  return (
    <ConfettiContext.Provider value={{ fire }}>
      {children}
      <ConfettiCanvas particles={particles} />
    </ConfettiContext.Provider>
  );
}

function ConfettiCanvas({ particles }: { particles: Particle[] }) {
  if (particles.length === 0) return null;
  return (
    <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: 0,
            top: 0,
            transform: `translate(${p.x}px, ${p.y}px) rotate(${p.rot}deg)`,
            width: `${p.size}px`,
            height: `${p.size * 1.4}px`,
            backgroundColor: p.color,
            borderRadius: p.shape === "circle" ? "50%" : "1px",
            opacity: Math.min(1, p.life / 30),
            willChange: "transform, opacity",
          }}
        />
      ))}
    </div>
  );
}

export function useConfetti(): ConfettiContextValue {
  const ctx = useContext(ConfettiContext);
  if (!ctx) throw new Error("useConfetti must be used inside <ConfettiProvider>");
  return ctx;
}

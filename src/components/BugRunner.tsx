import React, { useEffect, useRef, useState } from "react";

// Simple ladybug SVG using design tokens for colors
const LadybugSVG: React.FC<{ size?: number } & React.SVGProps<SVGSVGElement>> = ({ size = 72, ...props }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Red and black ladybug"
      {...props}
    >
      <defs>
        <clipPath id="split">
          <rect x="0" y="0" width="64" height="128" />
        </clipPath>
      </defs>
      {/* Shadow under bug */}
      <ellipse cx="64" cy="112" rx="24" ry="8" fill="hsl(var(--ring) / 0.15)" />

      {/* Head */}
      <circle cx="64" cy="28" r="16" fill="hsl(var(--bug-black))" />

      {/* Antennae */}
      <path d="M48 16 C36 6, 28 6, 24 12" stroke="hsl(var(--bug-black))" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M80 16 C92 6, 100 6, 104 12" stroke="hsl(var(--bug-black))" strokeWidth="4" fill="none" strokeLinecap="round" />

      {/* Body */}
      <ellipse cx="64" cy="72" rx="36" ry="44" fill="hsl(var(--bug-red))" stroke="hsl(var(--bug-black))" strokeWidth="4" />

      {/* Split line */}
      <line x1="64" y1="28" x2="64" y2="112" stroke="hsl(var(--bug-black))" strokeWidth="4" />

      {/* Spots */}
      <g fill="hsl(var(--bug-black))">
        <circle cx="50" cy="56" r="6" />
        <circle cx="42" cy="76" r="8" />
        <circle cx="52" cy="92" r="6" />
        <circle cx="78" cy="56" r="6" />
        <circle cx="86" cy="76" r="8" />
        <circle cx="76" cy="92" r="6" />
      </g>

      {/* Highlights */}
      <g opacity="0.2">
        <ellipse cx="52" cy="48" rx="10" ry="16" fill="hsl(var(--primary-foreground))" />
        <ellipse cx="76" cy="48" rx="10" ry="16" fill="hsl(var(--primary-foreground))" clipPath="url(#split)" />
      </g>
    </svg>
  );
};

function randUnitVector() {
  const angle = Math.random() * Math.PI * 2;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

const SPEED = 170; // px per second
const CHANGE_INTERVAL_MIN = 700; // ms
const CHANGE_INTERVAL_MAX = 2200; // ms

const BugRunner: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bugRef = useRef<HTMLDivElement | null>(null);

  const [pos, setPos] = useState({ x: 0, y: 0 });
  const posRef = useRef(pos);
  posRef.current = pos;

  const [vel, setVel] = useState(() => {
    const v = randUnitVector();
    return { x: v.x * SPEED, y: v.y * SPEED };
  });
  const velRef = useRef(vel);
  velRef.current = vel;

  const [dragging, setDragging] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const [bounds, setBounds] = useState({ w: 0, h: 0, padding: 24 });

  const [nextChangeAt, setNextChangeAt] = useState<number>(() =>
    performance.now() + CHANGE_INTERVAL_MIN + Math.random() * (CHANGE_INTERVAL_MAX - CHANGE_INTERVAL_MIN)
  );

  // Initialize center and bounds
  useEffect(() => {
    const measure = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setBounds({ w: rect.width, h: rect.height, padding: 24 });
      setPos({ x: rect.width / 2, y: rect.height / 2 });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Animation loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const step = (t: number) => {
      const dt = (t - last) / 1000; // seconds
      last = t;

      // Random direction change
      if (!dragging && t >= nextChangeAt) {
        const v = randUnitVector();
        setVel({ x: v.x * SPEED, y: v.y * SPEED });
        setNextChangeAt(
          t + CHANGE_INTERVAL_MIN + Math.random() * (CHANGE_INTERVAL_MAX - CHANGE_INTERVAL_MIN)
        );
      }

      if (!dragging) {
        let nx = posRef.current.x + velRef.current.x * dt;
        let ny = posRef.current.y + velRef.current.y * dt;

        const pad = bounds.padding;
        const minX = pad;
        const maxX = Math.max(pad, bounds.w - pad);
        const minY = pad;
        const maxY = Math.max(pad, bounds.h - pad);

        // Bounce on edges
        if (nx <= minX) {
          nx = minX;
          setVel((v) => ({ ...v, x: Math.abs(v.x) }));
        } else if (nx >= maxX) {
          nx = maxX;
          setVel((v) => ({ ...v, x: -Math.abs(v.x) }));
        }
        if (ny <= minY) {
          ny = minY;
          setVel((v) => ({ ...v, y: Math.abs(v.y) }));
        } else if (ny >= maxY) {
          ny = maxY;
          setVel((v) => ({ ...v, y: -Math.abs(v.y) }));
        }

        setPos({ x: nx, y: ny });
      }

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [bounds.h, bounds.w, dragging, nextChangeAt]);

  // Drag handlers using Pointer Events
  useEffect(() => {
    const el = bugRef.current;
    const container = containerRef.current;
    if (!el || !container) return;

    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      setDragging(true);
      const rect = el.getBoundingClientRect();
      dragOffsetRef.current = {
        x: e.clientX - (rect.left + rect.width / 2),
        y: e.clientY - (rect.top + rect.height / 2),
      };
      // Pause movement while dragging
      setVel({ x: 0, y: 0 });
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const crect = container.getBoundingClientRect();
      const x = e.clientX - crect.left - dragOffsetRef.current.x;
      const y = e.clientY - crect.top - dragOffsetRef.current.y;
      const pad = bounds.padding;
      const nx = Math.max(pad, Math.min(x, bounds.w - pad));
      const ny = Math.max(pad, Math.min(y, bounds.h - pad));
      setPos({ x: nx, y: ny });
    };

    const onPointerUp = () => {
      if (!dragging) return;
      setDragging(false);
      // If near center, snap to exact center
      const cx = bounds.w / 2;
      const cy = bounds.h / 2;
      const dx = posRef.current.x - cx;
      const dy = posRef.current.y - cy;
      const dist = Math.hypot(dx, dy);
      if (dist < 60) {
        setPos({ x: cx, y: cy });
      }
      const v = randUnitVector();
      setVel({ x: v.x * SPEED, y: v.y * SPEED });
      setNextChangeAt(
        performance.now() + CHANGE_INTERVAL_MIN + Math.random() * (CHANGE_INTERVAL_MAX - CHANGE_INTERVAL_MIN)
      );
    };

    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [bounds.h, bounds.w, dragging]);

  const angleDeg = Math.atan2(vel.y, vel.x) * (180 / Math.PI) + 90; // face movement

  return (
    <div ref={containerRef} className="relative min-h-[calc(100vh-0px)] w-full overflow-hidden app-gradient">
      {/* Center target */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-24 w-24 rounded-full border border-dashed border-muted-foreground/30 ring-1 ring-ring/10 animate-fade-in"
      />

      {/* Instructions */}
      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-center p-6">
        <div className="rounded-md bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/60 px-4 py-2 text-center shadow-sm border animate-enter">
          <h1 className="text-2xl font-bold tracking-tight">Red and Black Bug Runner</h1>
          <p className="text-sm text-muted-foreground">
            Drag the bug to the center. Release to let it run to random sides.
          </p>
        </div>
      </header>

      {/* Bug glow */}
      <div
        aria-hidden
        style={{ left: pos.x, top: pos.y }}
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 h-40 w-40 rounded-full bg-primary/15 blur-3xl"
      />

      {/* Bug */}
      <div
        ref={bugRef}
        role="img"
        aria-label="Interactive red and black bug"
        style={{ left: pos.x, top: pos.y, transform: `translate(-50%, -50%) rotate(${angleDeg}deg)` }}
        className="absolute select-none cursor-grab active:cursor-grabbing hover-scale drop-shadow-sm"
      >
        <LadybugSVG />
      </div>
    </div>
  );
};

export default BugRunner;

import { useEffect, useRef } from "react";
import { GENGAR } from "../brain/gengar.ts";
import { useReducedMotion } from "../lib/hooks.ts";
import { useStore } from "../lib/store.ts";

const ROWS = GENGAR.length;
const COLS = GENGAR[0]?.length ?? 1;
const INK = "#1a1a1a";
const DURATION = 1100;

/** Stable pseudo-random value for a cell, so every load assembles the same. */
const noise = (x: number, y: number) =>
  Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;

const DOTS = GENGAR.flatMap((row, y) =>
  [...row].flatMap((ch, x) =>
    ch === "0"
      ? []
      : [{ x, y, size: 0.2 + 0.62 * Math.sqrt((Number(ch) - 1) / 8) }],
  ),
);

/**
 * Square-dot Gengar beside the name, matching the brain's halftone. The dots
 * settle into place once the boot panel has gone, then the canvas stays still.
 */
export const HeroGlyph = ({ className }: { className?: string }) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const booted = useStore((s) => s.booted);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = canvas.current;
    const c = el?.getContext("2d");
    if (!el || !c || !booted) return;

    let pitch = 1;
    let raf = 0;
    const paint = (progress: number) => {
      c.clearRect(0, 0, el.width, el.height);
      c.fillStyle = INK;
      for (const d of DOTS) {
        const delay = noise(d.x, d.y) * 0.45;
        const local = Math.min(1, Math.max(0, (progress - delay) / 0.55));
        if (local === 0) continue;
        const eased = 1 - (1 - local) ** 3;
        const drift = (1 - eased) * pitch * 6;
        const side = d.size * pitch * eased;
        c.fillRect(
          (d.x + 0.5) * pitch - side / 2 + drift * (noise(d.y, d.x) - 0.5),
          (d.y + 0.5) * pitch - side / 2 + drift,
          side,
          side,
        );
      }
    };

    let current = reduced ? 1 : 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      el.width = Math.round(el.clientWidth * dpr);
      el.height = Math.round(el.clientHeight * dpr);
      pitch = el.width / COLS;
      paint(current);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    if (!reduced) {
      const start = performance.now();
      const tick = (now: number) => {
        current = Math.min(1, (now - start) / DURATION);
        paint(current);
        if (current < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [booted, reduced]);

  return (
    <canvas
      ref={canvas}
      role="img"
      aria-label="Halftone Gengar"
      style={{ aspectRatio: `${COLS} / ${ROWS}` }}
      className={className}
    />
  );
};

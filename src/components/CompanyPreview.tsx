import { useEffect, useRef } from "react";
import { COMPANY_GLYPHS } from "../brain/company-glyphs.ts";
import { getState, useStore } from "../lib/store.ts";

const W = 268;
const H = 176;
/** Halftone cell size in CSS px, and the offscreen supersampling factor. */
const PITCH = 2.5;
const SS = 2;
const SW = W * SS;
const SH = H * SS;
const GW = Math.floor(W / PITCH);
const GH = Math.floor(H / PITCH);
const SAMPLES: ReadonlyArray<[number, number]> = [
  [0, 0],
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/**
 * A small dot-matrix vignette of the hovered company's work, trailing the
 * cursor with a little lag. Fine pointers only.
 */
export const CompanyPreview = () => {
  const slug = useStore((s) => s.preview);
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const el = wrap.current;
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!el || !cv || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = W * dpr;
    cv.height = H * dpr;
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let x = mx;
    let y = my;
    let show = 0;
    let raf = 0;
    let last: string | null = null;
    const off = document.createElement("canvas");
    off.width = SW;
    off.height = SH;
    const src = off.getContext("2d", { willReadFrequently: true });
    if (!src) return;
    let shownSlug: string | null = null;
    let since = performance.now();
    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
    };
    const tick = (now: number) => {
      const current = getState().preview;
      if (current) last = current;
      show += ((current ? 1 : 0) - show) * 0.18;
      // Sit up and to the right of the pointer, flipping near the edges.
      const tx = mx + 28 + W > window.innerWidth - 12 ? mx - 28 - W : mx + 28;
      const ty = Math.min(
        Math.max(my - H - 16, 12),
        window.innerHeight - H - 12,
      );
      x += (tx - x) * 0.16;
      y += (ty - y) * 0.16;
      // Lean into the direction of travel.
      const lean = Math.max(-6, Math.min(6, (tx - x) * 0.05));
      el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${lean}deg) scale(${0.9 + show * 0.1})`;
      el.style.opacity = show.toFixed(3);
      if (show > 0.01 && last) {
        if (last !== shownSlug) {
          // Restart the scene so its figures count up for each new row.
          shownSlug = last;
          since = now;
        }
        const scene = COMPANY_GLYPHS[last];
        ctx.clearRect(0, 0, cv.width, cv.height);
        if (scene) {
          // 1. Draw the vector scene off-screen, white on black, at 2×.
          src.setTransform(1, 0, 0, 1, 0, 0);
          src.fillStyle = "#000";
          src.fillRect(0, 0, SW, SH);
          src.setTransform(SS, 0, 0, SS, SW / 2, SH / 2 + 2 * SS);
          scene(src, (now - since) / 1000);
          // 2. Halftone it: one square dot per cell, sized by brightness.
          const px = src.getImageData(0, 0, SW, SH).data;
          const cell = PITCH * SS;
          const half = Math.floor(cell / 2);
          for (let gy = 0; gy < GH; gy++) {
            for (let gx = 0; gx < GW; gx++) {
              const sx = Math.floor(gx * cell + half);
              const sy = Math.floor(gy * cell + half);
              // Average a small cross around the cell centre.
              let lum = 0;
              for (const [ox, oy] of SAMPLES) {
                const i = ((sy + oy) * SW + (sx + ox)) * 4;
                lum += px[i] ?? 0;
              }
              lum /= SAMPLES.length * 255;
              if (lum < 0.06) continue;
              const size = PITCH * dpr * Math.min(1, Math.sqrt(lum) * 0.95);
              ctx.fillStyle = `rgba(236,229,225,${(Math.min(1, 0.35 + lum) * show).toFixed(3)})`;
              ctx.fillRect(
                (gx * PITCH + PITCH / 2) * dpr - size / 2,
                (gy * PITCH + PITCH / 2) * dpr - size / 2,
                size,
                size,
              );
            }
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div
      ref={wrap}
      aria-hidden="true"
      data-active={slug !== null}
      className="pointer-events-none fixed top-0 left-0 z-[70] hidden bg-ink text-cream opacity-0 [@media(pointer:fine)]:block"
      style={{ width: W, height: H }}
    >
      <span className="absolute top-0 left-0 size-2.5 border-cream border-t border-l" />
      <span className="absolute top-0 right-0 size-2.5 border-cream border-t border-r" />
      <span className="absolute bottom-0 left-0 size-2.5 border-cream border-b border-l" />
      <span className="absolute right-0 bottom-0 size-2.5 border-cream border-r border-b" />
      <canvas ref={canvas} className="block size-full" />
    </div>
  );
};

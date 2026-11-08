import { useEffect, useRef } from "react";
import { COMPANY_GLYPHS } from "../brain/company-glyphs.ts";
import { companyBySlug } from "../content/index.ts";
import { getState, useStore } from "../lib/store.ts";

const W = 176;
const H = 124;

/**
 * A small dot-matrix vignette of the hovered company's work, trailing the
 * cursor with a little lag. Fine pointers only.
 */
export const CompanyPreview = () => {
  const slug = useStore((s) => s.preview);
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const caption = useRef<HTMLSpanElement>(null);

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
    const start = performance.now();
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
        const glyph = COMPANY_GLYPHS[last];
        ctx.clearRect(0, 0, cv.width, cv.height);
        if (glyph) {
          const t = (now - start) / 1000;
          const s = 1.6 * dpr;
          for (const [gx, gy, a] of glyph(t)) {
            ctx.fillStyle = `rgba(236,229,225,${(a * show).toFixed(3)})`;
            ctx.fillRect(
              (W / 2 + gx) * dpr - s / 2,
              (H / 2 - 6 + gy) * dpr - s / 2,
              s,
              s,
            );
          }
        }
        if (caption.current)
          caption.current.textContent = companyBySlug(last)?.name ?? "";
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
      <span
        ref={caption}
        className="absolute bottom-2 left-3 font-mono text-[9px] uppercase tracking-wide text-soft"
      />
    </div>
  );
};

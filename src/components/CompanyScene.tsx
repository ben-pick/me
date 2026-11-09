import { useEffect, useRef } from "react";
import { COMPANY_GLYPHS, SCENE_H, SCENE_W } from "../brain/company-glyphs.ts";
import { createHalftone } from "../brain/halftone.ts";
import { useReducedMotion } from "../lib/hooks.ts";

const PITCH = 2.5;
/** Far enough in for a scene's figures to have finished counting up. */
const STILL_AT = 8;

/** A company's animated dot-matrix vignette, playing from when it opens. */
export const CompanyScene = ({ slug }: { slug: string }) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const scene = COMPANY_GLYPHS[slug];
    const el = canvas.current;
    const c = el?.getContext("2d");
    const halftone = createHalftone(SCENE_W, SCENE_H, PITCH);
    if (!scene || !el || !c || !halftone) return;

    let scale = 1;
    let dpr = 1;
    const paint = (t: number) => {
      c.clearRect(0, 0, el.width, el.height);
      const cells = halftone.render((ctx, time) => {
        ctx.translate(0, 2);
        scene(ctx, time);
      }, t);
      for (const [x, y, lum] of cells) {
        const size = PITCH * scale * dpr * Math.min(1, Math.sqrt(lum) * 0.95);
        c.fillStyle = `rgba(236,229,225,${Math.min(1, 0.35 + lum).toFixed(3)})`;
        c.fillRect(
          el.width / 2 + x * scale * dpr - size / 2,
          el.height / 2 + y * scale * dpr - size / 2,
          size,
          size,
        );
      }
    };
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      el.width = Math.round(el.clientWidth * dpr);
      el.height = Math.round(el.clientHeight * dpr);
      scale = el.clientWidth / SCENE_W;
      if (reduced) paint(STILL_AT);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    let raf = 0;
    const born = performance.now();
    const tick = (now: number) => {
      paint((now - born) / 1000);
      raf = requestAnimationFrame(tick);
    };
    if (!reduced) raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [slug, reduced]);

  return (
    <canvas
      ref={canvas}
      style={{ aspectRatio: `${SCENE_W} / ${SCENE_H}` }}
      className="block w-full"
    />
  );
};

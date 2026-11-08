import { useEffect } from "react";
import { actions } from "./store.ts";

/**
 * Watches every `[data-region]` element and sets the brain's attention to the
 * one closest to the middle of the viewport.
 */
export const useAttentionTracker = () => {
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const mid = window.innerHeight / 2;
      let best: string | null = null;
      let bestDist = Number.POSITIVE_INFINITY;
      for (const el of document.querySelectorAll<HTMLElement>(
        "[data-region]",
      )) {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) continue;
        const d =
          r.top <= mid && r.bottom >= mid
            ? 0
            : Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid));
        if (d < bestDist) {
          bestDist = d;
          best = el.dataset.region ?? null;
        }
      }
      actions.setAttention(bestDist < window.innerHeight * 0.3 ? best : null);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      actions.setAttention(null);
    };
  }, []);
};

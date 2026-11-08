const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/—·";

/**
 * Shuffle an element's text, settling left to right on `text`. Returns a
 * cancel function. Does nothing with reduced motion.
 */
export const scramble = (
  el: HTMLElement,
  text: string,
  ms = 380,
): (() => void) => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    el.textContent = text;
    return () => {};
  }
  let raf = 0;
  const start = performance.now();
  const tick = (now: number) => {
    const p = (now - start) / ms;
    el.textContent = [...text]
      .map((ch, i) =>
        ch === " " || i < p * text.length
          ? ch
          : (GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? ch),
      )
      .join("");
    if (p < 1) raf = requestAnimationFrame(tick);
    else el.textContent = text;
  };
  raf = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(raf);
    el.textContent = text;
  };
};

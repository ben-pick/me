import { useEffect, useRef, useState } from "react";

const TARGETS =
  "a, button, [role=application], [role=option], [data-cursor], summary, label";
const PAD = 6;

const labelFor = (el: Element): string => {
  const explicit = el.getAttribute("data-cursor");
  if (explicit !== null) return explicit;
  if (el.getAttribute("role") === "application") return "Drag · click";
  if (el.getAttribute("aria-haspopup") === "dialog") return "Open";
  if (el instanceof HTMLAnchorElement) {
    if (el.target === "_blank") return "Visit ↗";
    if (el.href.startsWith("mailto:")) return "Email";
    return "Go";
  }
  return "";
};

/**
 * A crosshair dot plus four corner brackets that glide to frame whatever the
 * pointer is over. Fine pointers only; off with reduced motion.
 */
export const Cursor = () => {
  const [on, setOn] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setOn(fine.matches && !calm.matches);
    update();
    fine.addEventListener("change", update);
    calm.addEventListener("change", update);
    return () => {
      fine.removeEventListener("change", update);
      calm.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    if (!on) return;
    const root = document.documentElement;
    root.dataset.cursor = "on";
    let mx = -100;
    let my = -100;
    let target: Element | null = null;
    let visible = false;
    let down = false;
    const box = { x: -100, y: -100, w: 20, h: 20 };
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      mx = e.clientX;
      my = e.clientY;
      visible = true;
      const t = e.target instanceof Element ? e.target.closest(TARGETS) : null;
      if (t !== target) {
        target = t;
        if (label.current) label.current.textContent = t ? labelFor(t) : "";
      }
    };
    const onLeave = () => {
      visible = false;
    };
    const onDown = () => {
      down = true;
    };
    const onUp = () => {
      down = false;
    };

    const tick = () => {
      let tx = mx - 10;
      let ty = my - 10;
      let tw = 20;
      let th = 20;
      if (target?.isConnected) {
        const r = target.getBoundingClientRect();
        // Huge targets (full-width rows) get framed; tiny ones get padding.
        tx = r.left - PAD;
        ty = r.top - PAD;
        tw = r.width + PAD * 2;
        th = r.height + PAD * 2;
      }
      if (down) {
        tx += 3;
        ty += 3;
        tw -= 6;
        th -= 6;
      }
      const k = 0.24;
      box.x += (tx - box.x) * k;
      box.y += (ty - box.y) * k;
      box.w += (tw - box.w) * k;
      box.h += (th - box.h) * k;
      const f = frame.current;
      if (f) {
        f.style.transform = `translate3d(${box.x}px, ${box.y}px, 0)`;
        f.style.width = `${box.w}px`;
        f.style.height = `${box.h}px`;
        f.style.opacity = visible ? "1" : "0";
      }
      const d = dot.current;
      if (d) {
        d.style.transform = `translate3d(${mx - 2}px, ${my - 2}px, 0)`;
        d.style.opacity = visible ? "1" : "0";
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    document.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      delete root.dataset.cursor;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [on]);

  if (!on) return null;
  const corner = "absolute size-2.5 border-cream";
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[80] mix-blend-difference"
    >
      <div
        ref={frame}
        className="absolute top-0 left-0 opacity-0 transition-opacity duration-200"
      >
        <span className={`${corner} top-0 left-0 border-t border-l`} />
        <span className={`${corner} top-0 right-0 border-t border-r`} />
        <span className={`${corner} bottom-0 left-0 border-b border-l`} />
        <span className={`${corner} right-0 bottom-0 border-r border-b`} />
        <span
          ref={label}
          className="absolute -top-5 left-0 whitespace-nowrap font-mono text-[10px] uppercase tracking-wide text-cream"
        />
      </div>
      <div
        ref={dot}
        className="absolute top-0 left-0 size-1 bg-cream opacity-0"
      />
    </div>
  );
};

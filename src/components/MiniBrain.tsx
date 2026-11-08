import { useEffect, useRef, useState } from "react";
import { buildBrain, drawStill } from "../brain/points.ts";
import { interestBySlug } from "../content/index.ts";
import { audioLevel } from "../lib/audio.ts";
import { cx } from "../lib/cx.ts";
import { actions, getState, useStore } from "../lib/store.ts";
import { asRegion } from "./BrainPanel.tsx";
import { Brackets } from "./ui.tsx";

const W = 148;
const H = 104;

/**
 * Once the header brain scrolls away, a small one docks in the corner and
 * keeps glowing the region tied to whatever is on screen.
 */
export const MiniBrain = () => {
  const [docked, setDocked] = useState(false);
  const [moving, setMoving] = useState(false);
  const [overContact, setOverContact] = useState(false);
  const [held, setHeld] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const attention = useStore((s) => s.attention);
  const interest = useStore((s) => s.interest);
  const popoverOpen = useStore((s) => s.popover !== null);
  const region = asRegion(attention ?? interest);
  const info = interestBySlug(region);

  useEffect(() => {
    const target = document.getElementById("brain-panel");
    if (!target) return;
    const io = new IntersectionObserver(
      ([e]) => setDocked(!(e?.isIntersecting ?? true)),
      {
        rootMargin: "-40px 0px 0px 0px",
      },
    );
    io.observe(target);
    const contact = document.getElementById("contact");
    const io2 = new IntersectionObserver(([e]) =>
      setOverContact(e?.isIntersecting ?? false),
    );
    if (contact) io2.observe(contact);
    // Show while scrolling, then get out of the way of the content.
    let t = 0;
    const onScroll = () => {
      setMoving(true);
      clearTimeout(t);
      t = window.setTimeout(() => setMoving(false), 2000);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      io2.disconnect();
      clearTimeout(t);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  const visible = docked && !popoverOpen && !overContact && (moving || held);

  useEffect(() => {
    if (!visible) return;
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = W * dpr;
    cv.height = H * dpr;
    const brain = buildBrain(0.32);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let yaw = 0.9;
    let raf = 0;
    const tick = () => {
      if (!still) yaw += 0.008 + audioLevel() * 0.04;
      const r = asRegion(getState().attention ?? getState().interest);
      drawStill(ctx, brain, yaw, -0.22, W * dpr, H * dpr, dpr * 0.8, r);
      if (!still) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  return (
    <button
      type="button"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
      data-cursor={`Open ${info?.name ?? ""}`}
      onClick={(e) =>
        actions.openPopover(
          { kind: "interest", slug: region },
          {
            anchor: {
              x: e.clientX || window.innerWidth - 90,
              y: e.clientY || window.innerHeight - 80,
              rect: null,
            },
            trigger: e.currentTarget,
          },
        )
      }
      aria-label={`Inside my head: ${info?.name ?? ""}, ${info?.region ?? ""}. Open.`}
      className={cx(
        "group fixed right-[max(16px,env(safe-area-inset-right,0px))] bottom-[max(16px,env(safe-area-inset-bottom,0px))] z-30 hidden flex-col border-0 bg-panel p-0 text-left font-mono text-cream transition-[opacity,transform] duration-500 ease-out-expo md:flex",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-6 opacity-0",
      )}
    >
      <Brackets className="-m-1.5 text-ink" />
      <canvas ref={canvas} style={{ width: W, height: H }} className="block" />
      <span className="flex justify-between gap-3 border-cream/15 border-t px-2.5 py-1.5 text-[10px] uppercase">
        <span key={region} className="animate-rise [animation-duration:260ms]">
          {info?.num} {info?.name}
        </span>
        <span className="text-soft">{info?.region.replace(" lobe", "")}</span>
      </span>
    </button>
  );
};

import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import {
  buildBrain,
  drawLabels,
  drawStill,
  REGIONS,
  type Region,
  type ScreenAnchor,
} from "../brain/points.ts";
import type { BrainScene } from "../brain/scene.ts";
import { interestBySlug } from "../content/index.ts";
import { audioLevel } from "../lib/audio.ts";
import { cx } from "../lib/cx.ts";
import { useReducedMotion } from "../lib/hooks.ts";
import { actions, getState, useStore } from "../lib/store.ts";
import { Brackets, Grain } from "./ui.tsx";

export const asRegion = (s: string): Region =>
  ((REGIONS as ReadonlyArray<string>).find((r) => r === s) as Region) ??
  "bouldering";

const openInterest = (
  slug: Region,
  x: number,
  y: number,
  trigger: HTMLElement | null,
) =>
  actions.openPopover(
    { kind: "interest", slug },
    { anchor: { x, y, rect: null }, tone: "cream", trigger },
  );

/**
 * Header brain. Paints a still frame immediately (also the reduced-motion and
 * no-WebGL fallback), then lazy-loads the WebGL scene once the panel is near
 * the viewport and cross-fades to it.
 */
export const BrainPanel = () => {
  const host = useRef<HTMLDivElement>(null);
  const gl = useRef<HTMLCanvasElement>(null);
  const still = useRef<HTMLCanvasElement>(null);
  const labels = useRef<HTMLCanvasElement>(null);
  const scene = useRef<BrainScene | null>(null);
  const stillAnchors = useRef<ScreenAnchor[]>([]);
  const [live, setLive] = useState(false);
  const reduced = useReducedMotion();
  const selected = asRegion(useStore((s) => s.interest));
  const hovered = useStore((s) => s.hoverInterest);
  const booted = useStore((s) => s.booted);
  const attention = useStore((s) => s.attention);
  const shown = interestBySlug(hovered ?? selected);

  // Still frame: drawn on mount and whenever the selection changes.
  useEffect(() => {
    if (live) return;
    const el = host.current;
    const s = still.current;
    const l = labels.current;
    if (!el || !s || !l) return;
    const brain = buildBrain(0.6);
    const paint = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(el.clientWidth * dpr);
      const h = Math.round(el.clientHeight * dpr);
      s.width = l.width = w;
      s.height = l.height = h;
      const sctx = s.getContext("2d");
      const lctx = l.getContext("2d");
      if (!sctx || !lctx) return;
      drawStill(sctx, brain, 0.9, -0.22, w, h, dpr, selected);
      const lv = Object.fromEntries(
        REGIONS.map((r) => [r, r === selected ? 1 : 0]),
      ) as Record<Region, number>;
      stillAnchors.current = drawLabels(
        lctx,
        brain.anchors,
        0.9,
        -0.22,
        w,
        h,
        dpr,
        lv,
        { time: 1.2, sel: lv },
      );
    };
    paint();
    void document.fonts?.ready.then(paint);
    const ro = new ResizeObserver(paint);
    ro.observe(el);
    return () => ro.disconnect();
  }, [selected, live]);

  // Lazy-load the WebGL scene when the panel approaches the viewport.
  useEffect(() => {
    // Wait for the boot panel so the dots assemble in plain sight.
    if (reduced || !booted) return;
    const el = host.current;
    if (!el) return;
    let cancelled = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        void import("../brain/scene.ts").then(({ createBrainScene }) => {
          if (cancelled || !gl.current || !labels.current || !host.current)
            return;
          scene.current = createBrainScene({
            host: host.current,
            gl: gl.current,
            labels: labels.current,
            selected: asRegion(getState().interest),
            onHover: (r) => actions.hoverInterest(r),
            onPick: (r, x, y) => openInterest(r, x, y, host.current),
            onReady: () => setLive(true),
            beat: audioLevel,
          });
        });
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
      scene.current?.dispose();
      scene.current = null;
      setLive(false);
    };
  }, [reduced, booted]);

  useEffect(() => {
    scene.current?.setAttention(attention ? asRegion(attention) : null);
  }, [attention]);

  // Selections from elsewhere (palette, deep link) swing the camera too.
  useEffect(() => {
    scene.current?.focus(selected);
  }, [selected]);

  const cycle = (dir: 1 | -1) => {
    const i = REGIONS.indexOf(selected);
    const next =
      REGIONS[(i + dir + REGIONS.length) % REGIONS.length] ?? "bouldering";
    actions.setInterest(next);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      cycle(1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      cycle(-1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const r = host.current?.getBoundingClientRect();
      openInterest(
        selected,
        r ? r.left + r.width / 2 : 0,
        r ? r.top + r.height / 2 : 0,
        host.current,
      );
    }
  };

  // Clicks on the still frame (before WebGL, or as the fallback).
  const onStillClick = (e: React.PointerEvent<HTMLDivElement>) => {
    if (live) return;
    const r = host.current?.getBoundingClientRect();
    if (!r) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const x = (e.clientX - r.left) * dpr;
    const y = (e.clientY - r.top) * dpr;
    let best: ScreenAnchor | null = null;
    let bd = 80 * dpr;
    for (const a of stillAnchors.current) {
      const d = Math.hypot(a.x - x, a.y - y);
      if (d < bd) {
        bd = d;
        best = a;
      }
    }
    if (best) openInterest(best.region, e.clientX, e.clientY, host.current);
  };

  return (
    <div id="brain-panel" className="relative">
      <Brackets className="-m-2 text-ink" />
      <div
        ref={host}
        role="application"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: the brain is keyboard-operable (arrows + Enter)
        tabIndex={0}
        aria-roledescription="interactive brain"
        aria-label={`Inside my head: a 3D brain mapping my interests. Selected: ${shown?.name ?? ""}, ${shown?.region ?? ""}. Use arrow keys to change region and Enter to open it. Drag to rotate.`}
        onKeyDown={onKeyDown}
        onPointerUp={onStillClick}
        className="group relative h-[380px] touch-pan-y overflow-hidden bg-[radial-gradient(ellipse_at_50%_45%,#262626_0%,#121212_70%)] outline-none select-none focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-ink"
      >
        <canvas
          ref={still}
          className={cx(
            "absolute inset-0 block size-full transition-opacity duration-700",
            live ? "opacity-0" : "opacity-100",
          )}
        />
        <canvas
          ref={gl}
          className={cx(
            "absolute inset-0 block size-full transition-opacity duration-700",
            live ? "opacity-100" : "opacity-0",
          )}
        />
        <canvas
          ref={labels}
          className="pointer-events-none absolute inset-0 block size-full"
        />
        <Grain className="opacity-35" />
        <div className="pointer-events-none absolute top-3 left-3.5 text-[11px] uppercase text-soft">
          Inside my head — {reduced ? "click a region" : "drag to swivel"}
        </div>
        <div className="pointer-events-none absolute top-3 right-3.5 hidden gap-1 text-[10px] uppercase text-soft group-focus-visible:flex">
          ← → change · ↵ open
        </div>
        <div
          aria-live="polite"
          className="pointer-events-none absolute right-3.5 bottom-3 left-3.5 flex justify-between gap-3 text-[11px] uppercase text-cream"
        >
          <span
            key={shown?.slug}
            className="animate-rise [animation-duration:280ms]"
          >
            {shown?.num} {shown?.name}
          </span>
          <span className="text-soft">{shown?.region} · click to open</span>
        </div>
      </div>
    </div>
  );
};

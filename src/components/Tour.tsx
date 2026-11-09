import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cx } from "../lib/cx.ts";
import { useReducedMotion } from "../lib/hooks.ts";
import { actions, getState, useStore } from "../lib/store.ts";
import { timeline, tourPlayer } from "../tour/player.ts";
import { stateAt, type TourState } from "../tour/timeline.ts";
import { PAPER } from "./ui.tsx";

const sameView = (a: TourState, b: TourState) =>
  a.stopIndex === b.stopIndex &&
  a.target === b.target &&
  a.open === b.open &&
  a.region === b.region;

const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

const BUTTON =
  "min-h-11 flex-1 border border-ink px-3 text-[11px] uppercase whitespace-nowrap transition-colors duration-200 enabled:hover:bg-ink enabled:hover:text-cream disabled:opacity-30 md:flex-none";

/** Follows the narration until the visitor exits: the tour's whole lifetime. */
const TourSession = () => {
  const reduced = useReducedMotion();
  const bar = useRef<HTMLElement>(null);
  const [view, setView] = useState(() => stateAt(timeline, 0));
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const now = tourPlayer.now();
      const next = stateAt(timeline, now);
      setView((current) => (sameView(current, next) ? current : next));
      setElapsed(Math.floor(now * 10) / 10);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  /* Reserve the bar's height, so nothing is left hidden behind it. */
  const reserveBar = useCallback(() => {
    const height = bar.current?.offsetHeight ?? 0;
    const page = document.documentElement.style;
    page.paddingBottom = `${height}px`;
    page.scrollPaddingBottom = `${height}px`;
    actions.setTourBarHeight(height);
  }, []);

  useEffect(() => {
    const element = bar.current;
    if (!element) return;
    const observer = new ResizeObserver(reserveBar);
    observer.observe(element);
    return () => {
      observer.disconnect();
      const page = document.documentElement.style;
      page.paddingBottom = "";
      page.scrollPaddingBottom = "";
    };
  }, [reserveBar]);

  /* Focus gives each target the site's own highlight, then bring it into view. */
  useLayoutEffect(() => {
    reserveBar();
    const element = document.querySelector<HTMLElement>(
      `[data-tour="${view.target}"]`,
    );
    if (!element) return;
    const stickyNav = Number.parseFloat(
      getComputedStyle(document.documentElement).scrollPaddingTop,
    );
    const room =
      window.innerHeight - stickyNav - (bar.current?.offsetHeight ?? 0);
    element.focus({ preventScroll: true, focusVisible: true });
    element.scrollIntoView({
      block: element.offsetHeight > room ? "start" : "center",
      behavior: reduced ? "instant" : "smooth",
    });
    return () => element.blur();
  }, [view.target, reduced, reserveBar]);

  useEffect(() => {
    if (view.open) {
      actions.openPopover(
        { kind: "company", slug: view.open },
        { guided: true },
      );
    } else {
      actions.closePopover();
    }
  }, [view.open]);
  useEffect(() => () => actions.closePopover(), []);

  const [initialRegion] = useState(() => getState().interest);
  useEffect(() => {
    actions.setInterest(view.region ?? initialRegion);
  }, [view.region, initialRegion]);
  useEffect(() => () => actions.setInterest(initialRegion), [initialRegion]);

  /* The tour is modal for the page: only its bar and any open modal respond. */
  useEffect(() => {
    // Touch stays free, so a phone can still scroll a long stop into view.
    const onWheel = (event: WheelEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest("[role=dialog]")
      )
        return;
      event.preventDefault();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        tourPlayer.stop();
        return;
      }
      if (event.target instanceof Node && bar.current?.contains(event.target))
        return;
      if (event.key === "Tab") {
        event.preventDefault();
        bar.current?.querySelector("button")?.focus();
      } else if (!event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
      }
      // Browser shortcuts still work, but the site's own don't see the key.
      event.stopPropagation();
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown, { capture: true });
    };
  }, []);

  const progress = (elapsed / timeline.duration) * 100;

  return createPortal(
    <>
      {/* Takes every click on the page; modals sit above it, the bar above those. */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[45]"
        // Keeps focus, and so the highlight, on the current target.
        onMouseDown={(event) => event.preventDefault()}
      />
      <section
        ref={bar}
        aria-label="Guided tour"
        style={PAPER}
        className="fixed inset-x-0 bottom-0 z-[65] bg-cream pb-[env(safe-area-inset-bottom)] font-mono text-ink"
      >
        <div
          role="progressbar"
          aria-label="Tour progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          className="h-0.5 bg-ink/20"
        >
          <div className="h-full bg-ink" style={{ width: `${progress}%` }} />
        </div>
        <div className="mx-auto flex max-w-[1216px] flex-col gap-3 px-4 py-3 sm:px-8 md:flex-row md:items-center md:gap-8">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex justify-between gap-3 text-[10px] uppercase text-muted">
              <span>
                Guided tour · {String(view.stopIndex + 1).padStart(2, "0")} /{" "}
                {String(timeline.stops.length).padStart(2, "0")}
              </span>
              <span className="tabular-nums">
                {formatTime(elapsed)} / {formatTime(timeline.duration)}
              </span>
            </div>
            <p
              aria-live="polite"
              className="m-0 max-h-[30dvh] overflow-y-auto overscroll-contain text-[11px] uppercase leading-[1.5] sm:text-[12px]"
            >
              {view.caption}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              disabled={view.stopIndex === 0}
              onClick={() => tourPlayer.skip(-1)}
              className={BUTTON}
            >
              ← Prev
            </button>
            <button
              type="button"
              disabled={view.stopIndex === timeline.stops.length - 1}
              onClick={() => tourPlayer.skip(1)}
              className={BUTTON}
            >
              Next →
            </button>
            <button
              type="button"
              onClick={() => tourPlayer.stop()}
              className={BUTTON}
            >
              Exit
            </button>
          </div>
        </div>
      </section>
    </>,
    document.body,
  );
};

/** Lives for as long as the page, so leaving it ends the tour. */
export const TourPlayer = () => {
  const running = useStore((s) => s.tour.running);
  useEffect(() => () => tourPlayer.stop(), []);
  return running ? <TourSession /> : null;
};

export const TourButton = () => {
  const running = useStore((s) => s.tour.running);
  const button = useRef<HTMLButtonElement>(null);

  // Hand focus back on exit; `running` is false again by the time this runs.
  useEffect(() => {
    if (!running) return;
    return () => button.current?.focus({ preventScroll: true });
  }, [running]);

  return (
    <button
      ref={button}
      type="button"
      onClick={() => tourPlayer.start()}
      aria-label="Take the audio tour"
      className={cx(
        "flex min-h-11 items-center gap-2.5 border border-ink bg-ink px-3 font-mono text-[11px] uppercase whitespace-nowrap text-cream transition-colors duration-200 hover:bg-transparent hover:text-ink",
        running && "invisible",
      )}
    >
      <span
        aria-hidden="true"
        className="size-0 border-y-[4.5px] border-l-[7px] border-y-transparent border-l-current"
      />
      <span>
        <span className="hidden sm:inline">Audio </span>
        Tour
      </span>
      <span className="opacity-60">{formatTime(timeline.duration)}</span>
    </button>
  );
};

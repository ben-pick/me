import tourAssets from "virtual:tour-assets";
import { useCallback, useEffect, useRef, useState } from "react";
import { tour } from "../content/index.ts";
import { useReducedMotion } from "../lib/hooks.ts";
import { actions, anchorFrom, getState } from "../lib/store.ts";
import { focusBrainRegion } from "../tour/brain.ts";
import {
  type Clock,
  createNarration,
  createSilentClock,
  type Narration,
} from "../tour/clock.ts";
import {
  buildTimeline,
  stateAt,
  type Timeline,
  type Timing,
  type TimingWord,
  type TourState,
} from "../tour/timeline.ts";
import { Brackets } from "./ui.tsx";

const parseTiming = (value: unknown): Timing | null => {
  if (typeof value !== "object" || value === null) return null;
  const input = value as {
    duration?: unknown;
    words?: unknown;
    stops?: unknown;
  };
  if (
    typeof input.duration !== "number" ||
    !Number.isFinite(input.duration) ||
    input.duration <= 0 ||
    !Array.isArray(input.words)
  ) {
    return null;
  }
  const words: TimingWord[] = [];
  for (const entry of input.words) {
    if (typeof entry !== "object" || entry === null) return null;
    const word = entry as {
      word?: unknown;
      start?: unknown;
      end?: unknown;
    };
    if (
      typeof word.word !== "string" ||
      typeof word.start !== "number" ||
      typeof word.end !== "number" ||
      !Number.isFinite(word.start) ||
      !Number.isFinite(word.end)
    ) {
      return null;
    }
    const start = Math.max(0, word.start);
    words.push({
      word: word.word,
      start,
      end: Math.max(start, word.end),
    });
  }
  // The build script records where each stop actually sits; keep it, or the
  // page falls back to guessing and can move on before a line finishes.
  const stops: Array<{ id: string; start: number; end: number }> = [];
  if (Array.isArray(input.stops)) {
    for (const entry of input.stops) {
      if (typeof entry !== "object" || entry === null) continue;
      const stop = entry as { id?: unknown; start?: unknown; end?: unknown };
      if (
        typeof stop.id === "string" &&
        typeof stop.start === "number" &&
        typeof stop.end === "number"
      ) {
        stops.push({ id: stop.id, start: stop.start, end: stop.end });
      }
    }
  }
  return stops.length > 0
    ? { duration: input.duration, stops, words }
    : { duration: input.duration, words };
};

const targetElement = (name: string): HTMLElement | null => {
  if (typeof document === "undefined") return null;
  const escaped = name.replace(/["\\]/g, "\\$&");
  return document.querySelector<HTMLElement>(`[data-tour="${escaped}"]`);
};

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

const formatTime = (seconds: number) => {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
};

const stateKey = (state: TourState) =>
  [
    state.stopId,
    state.target,
    state.open ?? "",
    state.region ?? "",
    state.ended ? "1" : "0",
  ].join("|");

/**
 * A caption-first guided tour. The narration's position is the clock: each
 * frame asks `stateAt` for the complete desired state, so pause, seek and
 * resume all work without carrying any state of their own.
 */
export const Tour = () => {
  const reduced = useReducedMotion();
  const [running, setRunning] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [snapshot, setSnapshot] = useState<TourState | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const hovered = useRef<HTMLElement | null>(null);

  const timeline = useRef<Timeline | null>(null);
  const timing = useRef<Timing | null>(null);
  const clock = useRef<Clock | null>(null);
  const narration = useRef<Narration | null>(null);
  const audioAvailable = useRef(tourAssets.audio);
  const runningRef = useRef(false);
  const playingRef = useRef(false);
  const snapshotRef = useRef<TourState | null>(null);
  const raf = useRef(0);
  const lastUi = useRef(0);
  const lastKey = useRef("");
  const scrollKey = useRef("");
  const programmaticUntil = useRef(0);
  const initialInterest = useRef("bouldering");
  const startButton = useRef<HTMLButtonElement>(null);

  /**
   * Use the page's own hover and focus behaviour for the current target, rather
   * than drawing a highlight on top of it.
   */
  const enter = useCallback((element: HTMLElement | null) => {
    const previous = hovered.current;
    if (previous === element) return;
    if (previous) {
      previous.dispatchEvent(
        new PointerEvent("pointerout", { bubbles: true, pointerType: "mouse" }),
      );
      previous.blur();
    }
    hovered.current = element;
    if (!element) return;
    const box = element.getBoundingClientRect();
    const at = {
      bubbles: true,
      cancelable: true,
      pointerType: "mouse",
      clientX: box.left + box.width / 2,
      clientY: box.top + box.height / 2,
    };
    element.dispatchEvent(new PointerEvent("pointerover", at));
    element.dispatchEvent(new PointerEvent("pointermove", at));
    if (element.tabIndex >= 0 || element.matches("a, button, [tabindex]")) {
      element.focus({ preventScroll: true });
    }
  }, []);

  /**
   * Scroll a target into the space above the control bar. A smooth scroll can
   * be overtaken by the next one, so it settles, then corrects if needed.
   */
  const reveal = useCallback(
    (element: HTMLElement) => {
      const place = (behavior: ScrollBehavior) => {
        const box = element.getBoundingClientRect();
        const bar = document
          .querySelector("[data-tour-ui]")
          ?.getBoundingClientRect();
        const top = 24;
        const room = (bar ? bar.top : window.innerHeight) - top - 16;
        const want =
          box.height >= room ? top : top + Math.max(0, room - box.height) / 2;
        const delta = box.top - want;
        if (Math.abs(delta) > 2) window.scrollBy({ top: delta, behavior });
      };
      // Covers the smooth scroll and the correction pass below.
      programmaticUntil.current = performance.now() + 3000;
      place(reduced ? "instant" : "smooth");
      window.setTimeout(() => place("instant"), 800);
    },
    [reduced],
  );

  const applyState = useCallback(
    (state: TourState) => {
      const popover = getState().popover;
      if (state.open) {
        if (popover?.id.kind !== "company" || popover.id.slug !== state.open) {
          // Move focus out of the control bar before Radix hides the page.
          const active = document.activeElement;
          if (
            active instanceof HTMLElement &&
            active.closest("[data-tour-ui]")
          ) {
            active.blur();
          }
          const trigger = targetElement(state.target);
          actions.openPopover(
            { kind: "company", slug: state.open },
            trigger ? { anchor: anchorFrom(trigger), trigger } : {},
          );
        }
      } else if (popover) {
        actions.closePopover();
      }

      if (state.region) {
        if (getState().interest !== state.region) {
          actions.setInterest(state.region);
        }
        focusBrainRegion(state.region);
      } else if (getState().interest !== initialInterest.current) {
        actions.setInterest(initialInterest.current);
        focusBrainRegion(initialInterest.current);
      }

      const key = `${state.stopId}:${state.target}:${state.open ?? ""}`;
      if (scrollKey.current !== key) {
        scrollKey.current = key;
        const element = targetElement(state.target);
        enter(element);
        if (element) reveal(element);
      }
    },
    [enter, reveal],
  );

  const syncAt = useCallback(
    (seconds: number, nextTimeline?: Timeline) => {
      const current = nextTimeline ?? timeline.current;
      if (!current) return;
      const time = Math.min(Math.max(seconds, 0), current.duration);
      const state = stateAt(current, time);
      const key = stateKey(state);
      if (key !== lastKey.current) {
        lastKey.current = key;
        applyState(state);
        snapshotRef.current = state;
        setSnapshot(state);
      }
      setElapsed(time);
    },
    [applyState],
  );

  const tick = useCallback(() => {
    const current = clock.current;
    const line = timeline.current;
    if (!current || !line || !runningRef.current) return;

    const time = Math.min(Math.max(current.now(), 0), line.duration);
    narration.current?.follow(time);
    const state = stateAt(line, time);
    const key = stateKey(state);
    if (key !== lastKey.current) {
      lastKey.current = key;
      applyState(state);
      snapshotRef.current = state;
      setSnapshot(state);
    }

    const now = performance.now();
    if (now - lastUi.current >= 100 || state.ended) {
      lastUi.current = now;
      setElapsed(time);
    }

    if (state.ended) {
      current.pause();
      narration.current?.pause();
      playingRef.current = false;
      setPlaying(false);
      setElapsed(line.duration);
      const end = stateAt(line, line.duration);
      applyState(end);
      snapshotRef.current = end;
      setSnapshot(end);
      lastKey.current = stateKey(end);
      return;
    }

    if (playingRef.current) raf.current = requestAnimationFrame(tick);
  }, [applyState]);

  const start = useCallback(() => {
    if (runningRef.current || typeof window === "undefined") return;
    initialInterest.current = getState().interest;
    actions.closePalette();

    const line = buildTimeline(tour.stops, timing.current);
    timeline.current = line;
    clock.current?.dispose();
    const silent = createSilentClock();
    clock.current = silent;
    void silent.play();

    runningRef.current = true;
    playingRef.current = true;
    lastKey.current = "";
    lastUi.current = 0;
    scrollKey.current = "";
    setRunning(true);
    setPlaying(true);
    setElapsed(0);

    const first = stateAt(line, 0);
    applyState(first);
    snapshotRef.current = first;
    setSnapshot(first);
    lastKey.current = stateKey(first);

    if (audioAvailable.current) {
      const element = new Audio(`/tour/narration.mp3?v=${tourAssets.version}`);
      element.preload = "auto";
      const voice = createNarration(element);
      narration.current = voice;
      // Must be called inside the click's own task.
      voice.play();
    }

    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(tick);
  }, [applyState, tick]);

  const pauseTour = useCallback(() => {
    if (!runningRef.current) return;
    clock.current?.pause();
    narration.current?.pause();
    playingRef.current = false;
    setPlaying(false);
    cancelAnimationFrame(raf.current);
    raf.current = 0;
  }, []);

  const resumeTour = useCallback(() => {
    const current = clock.current;
    const line = timeline.current;
    if (!runningRef.current || !current || !line) return;

    if (current.now() >= line.duration) {
      current.seek(0);
      narration.current?.seek(0);
    }
    void current.play();
    narration.current?.play();
    playingRef.current = true;
    setPlaying(true);
    lastKey.current = "";
    syncAt(current.now());
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(tick);
  }, [syncAt, tick]);

  const exitTour = useCallback(() => {
    if (!runningRef.current) return;
    runningRef.current = false;
    playingRef.current = false;
    cancelAnimationFrame(raf.current);
    raf.current = 0;
    clock.current?.dispose();
    clock.current = null;
    narration.current?.dispose();
    narration.current = null;
    actions.closePopover();
    actions.closePalette();
    actions.hoverInterest(null);
    if (getState().interest !== initialInterest.current) {
      actions.setInterest(initialInterest.current);
    }
    setRunning(false);
    setPlaying(false);
    setSnapshot(null);
    snapshotRef.current = null;
    setElapsed(0);
    lastKey.current = "";
    scrollKey.current = "";
    programmaticUntil.current = 0;
    window.setTimeout(() => {
      startButton.current?.focus({ preventScroll: true });
    }, 0);
  }, []);

  const skip = useCallback(
    (direction: -1 | 1) => {
      const current = clock.current;
      const line = timeline.current;
      const state = snapshotRef.current;
      if (!current || !line || !state) return;

      let destination: number;
      if (direction < 0) {
        const stop = line.stops[state.stopIndex];
        if (stop && current.now() - stop.start > 1.5) {
          destination = stop.start;
        } else {
          destination =
            line.stops[Math.max(0, state.stopIndex - 1)]?.start ?? 0;
        }
      } else {
        destination = line.stops[state.stopIndex + 1]?.start ?? line.duration;
      }
      destination = Math.min(
        Math.max(destination, 0),
        Math.max(0, line.duration),
      );
      // Land on the new stop and wait there, rather than carrying on mid-sentence.
      current.seek(destination);
      narration.current?.seek(destination);

      const at = stateAt(line, destination);
      lastKey.current = stateKey(at);
      applyState(at);
      snapshotRef.current = at;
      setSnapshot(at);
      setElapsed(destination);

      if (destination >= line.duration) {
        current.pause();
        narration.current?.pause();
        playingRef.current = false;
        setPlaying(false);
        setElapsed(line.duration);
        cancelAnimationFrame(raf.current);
        return;
      }
      // Carry on from the new stop rather than making the viewer press Resume.
      playingRef.current = true;
      setPlaying(true);
      void current.play();
      narration.current?.play();
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(tick);
    },
    [applyState, tick],
  );

  const toggle = useCallback(() => {
    if (!runningRef.current) return;
    if (playingRef.current) pauseTour();
    else resumeTour();
  }, [pauseTour, resumeTour]);

  /* Load the recording's word timings when the build found a recording. */
  useEffect(() => {
    if (!tourAssets.timing) return;
    let cancelled = false;

    const loadTiming = async () => {
      try {
        const response = await fetch(
          `/tour/timing.json?v=${tourAssets.version}`,
          { cache: "no-cache" },
        );
        if (!response.ok) return;
        const value: unknown = await response.json();
        const parsed = parseTiming(value);
        if (!parsed || cancelled) return;
        timing.current = parsed;
        if (runningRef.current && timeline.current) {
          const next = buildTimeline(tour.stops, parsed);
          timeline.current = next;
          const time = Math.min(clock.current?.now() ?? 0, next.duration);
          clock.current?.seek(time);
          lastKey.current = "";
          syncAt(time, next);
        }
      } catch {
        // No recording yet; the word-count estimate is the fallback.
      }
    };

    void loadTiming();
    return () => {
      cancelled = true;
    };
  }, [syncAt]);

  /* Locked in until Exit: the page cannot be scrolled, clicked or typed into. */
  useEffect(() => {
    if (!running) return;

    const inTourUi = (element: EventTarget | null) =>
      element instanceof Element && element.closest("[data-tour-ui]") !== null;

    const onScrollInput = (event: Event) => {
      if (inTourUi(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
    };

    const onPointer = (event: Event) => {
      if (inTourUi(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
    };

    const scrollKeys = new Set([
      " ",
      "PageUp",
      "PageDown",
      "Home",
      "End",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
    ]);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        exitTour();
        return;
      }
      if (inTourUi(event.target)) return;
      if (scrollKeys.has(event.key) || isTyping(event.target)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      // Type-to-search belongs to the site, not to the tour.
      if (event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    // A plain wheel/touch event whose target is the page: block it, don't pause.
    window.addEventListener("wheel", onScrollInput, { passive: false });
    window.addEventListener("touchmove", onScrollInput, { passive: false });
    window.addEventListener("pointerdown", onPointer, { capture: true });
    window.addEventListener("keydown", onKey, { capture: true });
    return () => {
      window.removeEventListener("wheel", onScrollInput);
      window.removeEventListener("touchmove", onScrollInput);
      window.removeEventListener("pointerdown", onPointer, { capture: true });
      window.removeEventListener("keydown", onKey, { capture: true });
    };
  }, [running, exitTour]);

  /* Do not leave a clock running if the page navigates away. */
  useEffect(
    () => () => {
      runningRef.current = false;
      playingRef.current = false;
      cancelAnimationFrame(raf.current);
      clock.current?.dispose();
      clock.current = null;
      narration.current?.dispose();
      narration.current = null;
    },
    [],
  );

  const total = timeline.current?.stops.length ?? tour.stops.length;
  const duration = timeline.current?.duration ?? 0;
  const progress =
    duration > 0
      ? Math.round((Math.min(elapsed, duration) / duration) * 100)
      : Math.round((snapshot?.progress ?? 0) * 100);
  return (
    <>
      {running ? (
        <>
          {/* Swallows clicks on the page; the tour owns the pointer until Exit. */}
          <div
            aria-hidden="true"
            // Above a modal's backdrop (z-40) so clicking outside cannot close it,
            // but below the modal itself (z-50) and the controls (z-65).
            className="pointer-events-auto fixed inset-0 z-[45] cursor-default"
          />
        </>
      ) : null}

      {!running ? (
        <button
          ref={startButton}
          type="button"
          onClick={start}
          className="group relative inline-flex min-h-7 items-center gap-2 border border-ink px-2 py-1 text-[11px] uppercase transition-colors duration-300 hover:bg-ink hover:text-cream focus-visible:outline-offset-2"
        >
          <Brackets className="-m-[3px] text-current opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100" />
          Take the tour
          <span
            aria-hidden="true"
            className="transition-transform duration-300 ease-out-expo group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          >
            ↗
          </span>
        </button>
      ) : null}

      {running && snapshot ? (
        <section
          data-tour-ui
          aria-label="Guided tour"
          // The page sets pointer-events: none while a modal is open, so the
          // controls have to opt back in to stay clickable.
          className="pointer-events-auto fixed inset-x-0 bottom-0 z-[65] px-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-6"
        >
          <div className="relative mx-auto flex w-full max-w-[1216px] flex-col gap-3 border border-ink bg-cream p-3.5 text-ink sm:p-4">
            <Brackets className="-m-[5px] text-ink/40" />
            <div className="flex items-center justify-between gap-3 text-[10px] uppercase text-muted">
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className="size-1.5 bg-ink" />
                Guided tour
              </span>
              <span>
                {String(snapshot.stopIndex + 1).padStart(2, "0")} /{" "}
                {String(total).padStart(2, "0")}
              </span>
            </div>

            <p
              aria-live="polite"
              aria-atomic="true"
              className="m-0 max-h-[24dvh] overflow-y-auto overscroll-contain pr-1 text-[11px] uppercase leading-[1.55] sm:text-[12px]"
            >
              {snapshot.caption}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => skip(-1)}
                className="min-h-11 border border-ink px-3 text-[11px] uppercase transition-colors duration-200 hover:bg-ink hover:text-cream"
              >
                ← Prev
              </button>
              <button
                type="button"
                onClick={toggle}
                className="min-h-11 border border-ink bg-ink px-3 text-[11px] uppercase text-cream transition-colors duration-200 hover:bg-transparent hover:text-ink"
              >
                {playing ? "Pause" : snapshot.ended ? "Replay" : "Resume"}
              </button>
              <button
                type="button"
                onClick={() => skip(1)}
                className="min-h-11 border border-ink px-3 text-[11px] uppercase transition-colors duration-200 hover:bg-ink hover:text-cream"
              >
                Next →
              </button>

              <div className="flex min-w-[110px] flex-1 items-center gap-2">
                <div
                  role="progressbar"
                  aria-label="Tour progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                  aria-valuetext={`${progress}%`}
                  className="h-px flex-1 bg-ink/20"
                >
                  <div
                    className="h-full bg-ink transition-[width] duration-100 ease-linear"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="whitespace-nowrap text-[10px] tabular-nums text-muted">
                  {formatTime(elapsed)} / {formatTime(duration)}
                </span>
              </div>

              <button
                type="button"
                onClick={exitTour}
                className="min-h-11 border border-ink px-3 text-[11px] uppercase transition-colors duration-200 hover:bg-ink hover:text-cream"
              >
                Exit <span className="text-[10px] text-muted">Esc</span>
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
};

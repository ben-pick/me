import { useEffect, useRef } from "react";
import { content } from "../content/index.ts";
import {
  audioBands,
  canPlay,
  isPlaceholder,
  toggleSong,
} from "../lib/audio.ts";
import { cx } from "../lib/cx.ts";
import { useStore } from "../lib/store.ts";
import { Brackets } from "./ui.tsx";

const BARS = 14;

/** Dot-matrix level meter: live bands while playing, a slow idle wave otherwise. */
const Meter = ({ playing }: { playing: boolean }) => {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const tick = (now: number) => {
      const bands = playing ? audioBands(BARS) : [];
      el.childNodes.forEach((bar, i) => {
        const v = playing
          ? (bands[i] ?? 0)
          : still
            ? 0.3
            : 0.3 + 0.18 * Math.sin(now / 520 + i * 0.7);
        (bar as HTMLElement).style.transform =
          `scaleY(${Math.max(0.08, v).toFixed(3)})`;
      });
      if (!still || playing) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
  return (
    <span ref={ref} aria-hidden="true" className="flex h-5 items-end gap-[3px]">
      {Array.from({ length: BARS }, (_, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed bars
          key={i}
          className="h-full w-[3px] origin-bottom transition-transform duration-75 [background-image:repeating-linear-gradient(to_top,currentColor_0_2px,transparent_2px_4px)]"
        />
      ))}
    </span>
  );
};

/** Current favourite song: play it, and the brain's DJing region moves with it. */
export const NowPlaying = ({ tone = "cream" }: { tone?: "cream" | "ink" }) => {
  const playing = useStore((s) => s.playing);
  const song = content.nowPlaying;
  const playable = canPlay();
  return (
    <div
      className={cx(
        "flex max-w-[480px] items-center gap-4 border py-2 pr-4 pl-2",
        tone === "cream" ? "border-ink/40" : "border-current/25",
      )}
    >
      <button
        type="button"
        onClick={() => void toggleSong()}
        aria-label={playing ? "Pause" : `Play ${song.title} by ${song.artist}`}
        aria-pressed={playing}
        data-cursor={playing ? "Pause" : playable ? "Play" : "No file yet"}
        className={cx(
          "group relative grid size-11 shrink-0 place-items-center border-0 bg-transparent font-mono text-[13px] transition-transform duration-200 active:scale-90",
          tone === "cream" ? "text-ink" : "text-current",
          !playable && "opacity-50",
        )}
      >
        <Brackets />
        <span className="transition-transform duration-300 ease-out-expo group-hover:scale-110">
          {playing ? "❚❚" : "▶"}
        </span>
      </button>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-[11px] uppercase">
        <span className="opacity-60">
          {playing ? "Now playing" : "On repeat"}
        </span>
        <span className="truncate">
          {song.title} — {song.artist}
        </span>
      </span>
      <Meter playing={playing} />
      {song.url && !isPlaceholder(song.url) ? (
        <a
          href={song.url}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-[11px] uppercase no-underline opacity-70 hover:opacity-100"
        >
          Full ↗
        </a>
      ) : null}
    </div>
  );
};

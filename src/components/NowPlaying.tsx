import { useEffect, useRef } from "react";
import { content } from "../content/index.ts";
import {
  audioBands,
  canPlay,
  isPlaceholder,
  SPOTIFY_MOUNT_ID,
  STATIC_BUILD,
  spotifyTrack,
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
export const NowPlaying = ({
  tone = "cream",
  host = false,
}: {
  tone?: "cream" | "ink";
  host?: boolean;
}) => {
  const playing = useStore((s) => s.playing);
  const open = useStore((s) => s.playerOpen);
  const song = content.nowPlaying;
  const playable = canPlay();
  const spotify = spotifyTrack() !== null;
  const named = !isPlaceholder(song.title) && !isPlaceholder(song.artist);
  // The static build can't embed Spotify, so its button opens the track instead.
  const linkOut = STATIC_BUILD && spotify && !playable;
  const buttonClass = cx(
    "group relative grid size-11 shrink-0 place-items-center border-0 bg-transparent font-mono text-[13px] no-underline transition-transform duration-200 active:scale-90",
    tone === "cream" ? "text-ink" : "text-current",
    !playable && !linkOut && "opacity-50",
  );
  const icon = (
    <>
      <Brackets />
      <span className="transition-transform duration-300 ease-out-expo group-hover:scale-110">
        {playing ? "❚❚" : "▶"}
      </span>
    </>
  );
  return (
    <div className="flex max-w-[480px] flex-col gap-2">
      <div
        className={cx(
          "flex items-center gap-4 border py-2 pr-4 pl-2",
          tone === "cream" ? "border-ink/40" : "border-current/25",
        )}
      >
        {linkOut ? (
          <a
            href={song.url}
            target="_blank"
            rel="noreferrer"
            aria-label="Play on Spotify"
            className={buttonClass}
          >
            {icon}
          </a>
        ) : (
          <button
            type="button"
            onClick={() => void toggleSong()}
            aria-label={
              playing
                ? "Pause"
                : named
                  ? `Play ${song.title} by ${song.artist}`
                  : "Play my current favourite song"
            }
            aria-pressed={playing}
            className={buttonClass}
          >
            {icon}
          </button>
        )}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-[11px] uppercase">
          <span className="opacity-60">
            {playing ? "Now playing" : "On repeat"}
          </span>
          <span className="truncate">
            {named
              ? `${song.title} — ${song.artist}`
              : spotify
                ? "Current favourite · Spotify"
                : "[Add a song]"}
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
            {spotify ? "Spotify ↗" : "Full ↗"}
          </a>
        ) : null}
      </div>
      {host && spotify && !STATIC_BUILD ? (
        // Spotify's embedded player mounts here on first play.
        <div
          className={cx(
            "overflow-hidden transition-[height,opacity] duration-500 ease-out-expo",
            open ? "h-20 opacity-100" : "h-0 opacity-0",
          )}
        >
          <div id={SPOTIFY_MOUNT_ID} />
        </div>
      ) : null}
    </div>
  );
};

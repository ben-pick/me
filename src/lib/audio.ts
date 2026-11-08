import { content } from "../content/index.ts";
import { actions, getState } from "./store.ts";

/** A bracketed value in content is a placeholder, not something to load. */
export const isPlaceholder = (v: string | undefined) =>
  !v || /^\[.*\]$/.test(v.trim());

/** The static artifact build can't load third-party scripts or iframes. */
export const STATIC_BUILD = import.meta.env.MODE === "artifact";

export const spotifyTrack = (): string | null =>
  /open\.spotify\.com\/track\/([A-Za-z0-9]+)/.exec(
    content.nowPlaying.url ?? "",
  )?.[1] ?? null;

const hasFile = () => !isPlaceholder(content.nowPlaying.audio);

/** Can the play button play in place (file or Spotify embed)? */
export const canPlay = () =>
  hasFile() || (spotifyTrack() !== null && !STATIC_BUILD);

/* ------------------------------------------------------------- File audio */

let audio: HTMLAudioElement | null = null;
let analyser: AnalyserNode | null = null;
let bins: Uint8Array<ArrayBuffer> | null = null;
let smoothed = 0;

const ensureFile = () => {
  if (audio) return audio;
  const src = content.nowPlaying.audio;
  if (!src || isPlaceholder(src)) return null;
  audio = new Audio(src);
  audio.loop = true;
  audio.crossOrigin = "anonymous";
  audio.addEventListener("play", () => actions.setPlaying(true));
  audio.addEventListener("pause", () => actions.setPlaying(false));
  try {
    const ctx = new AudioContext();
    const node = ctx.createMediaElementSource(audio);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.7;
    bins = new Uint8Array(analyser.frequencyBinCount);
    node.connect(analyser);
    analyser.connect(ctx.destination);
    audio.addEventListener("play", () => void ctx.resume());
  } catch {
    analyser = null;
  }
  return audio;
};

/* ---------------------------------------------------------- Spotify embed */

interface SpotifyController {
  togglePlay(): void;
  play(): void;
  pause(): void;
  addListener(event: "ready", cb: () => void): void;
  addListener(
    event: "playback_update",
    cb: (e: { data: { isPaused: boolean } }) => void,
  ): void;
}
interface SpotifyIFrameAPI {
  createController(
    el: HTMLElement,
    options: { uri: string; width: string | number; height: number },
    cb: (controller: SpotifyController) => void,
  ): void;
}
declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: SpotifyIFrameAPI) => void;
  }
}

let controller: Promise<SpotifyController> | null = null;
export const SPOTIFY_MOUNT_ID = "spotify-embed";

const loadSpotify = (id: string): Promise<SpotifyController> => {
  if (controller) return controller;
  controller = new Promise((resolve, reject) => {
    const mount = document.getElementById(SPOTIFY_MOUNT_ID);
    if (!mount) {
      reject(new Error("No mount for the Spotify player"));
      return;
    }
    window.onSpotifyIframeApiReady = (api) => {
      api.createController(
        mount,
        { uri: `spotify:track:${id}`, width: "100%", height: 80 },
        (c) => {
          c.addListener("playback_update", (e) =>
            actions.setPlaying(!e.data.isPaused),
          );
          c.addListener("ready", () => resolve(c));
        },
      );
    };
    const s = document.createElement("script");
    s.src = "https://open.spotify.com/embed/iframe-api/v1";
    s.async = true;
    s.onerror = () => reject(new Error("Spotify player failed to load"));
    document.body.appendChild(s);
  });
  controller.catch(() => {
    controller = null;
  });
  return controller;
};

/* ------------------------------------------------------------------ Public */

export const toggleSong = async () => {
  if (hasFile()) {
    const a = ensureFile();
    if (!a) return;
    if (a.paused) {
      try {
        await a.play();
      } catch {
        actions.toast("Couldn't start playback");
      }
    } else a.pause();
    return;
  }
  const id = spotifyTrack();
  if (!id) {
    actions.toast("No song yet — add one in content/now-playing.md");
    return;
  }
  if (STATIC_BUILD) {
    window.open(content.nowPlaying.url, "_blank", "noopener");
    return;
  }
  actions.setPlayerOpen(true);
  try {
    // Let the mount render before Spotify takes it over.
    await new Promise((r) => requestAnimationFrame(r));
    const c = await loadSpotify(id);
    c.togglePlay();
  } catch {
    actions.toast("Couldn't load the Spotify player");
  }
};

/** Bass-weighted level 0–1, smoothed. Cheap enough to call every frame. */
export const audioLevel = (): number => {
  if (audio && !audio.paused && analyser && bins) {
    analyser.getByteFrequencyData(bins);
    let sum = 0;
    const n = Math.min(16, bins.length);
    for (let i = 0; i < n; i++) sum += bins[i] ?? 0;
    smoothed += (sum / n / 255 - smoothed) * 0.35;
    return smoothed;
  }
  if (getState().playing) {
    // Spotify's player is cross-origin, so pulse on a steady ~122 bpm instead.
    const beat = ((performance.now() / 1000) * (122 / 60)) % 1;
    smoothed += (Math.max(0, 1 - beat * 3) * 0.8 - smoothed) * 0.5;
    return smoothed;
  }
  smoothed *= 0.9;
  return smoothed;
};

/** Frequency bands 0–1 for the meter. */
export const audioBands = (count: number): number[] => {
  if (audio && !audio.paused && analyser && bins) {
    analyser.getByteFrequencyData(bins);
    const per = Math.floor((bins.length * 0.7) / count);
    return Array.from({ length: count }, (_, i) => {
      let s = 0;
      for (let j = 0; j < per; j++) s += bins?.[i * per + j] ?? 0;
      return s / per / 255;
    });
  }
  if (getState().playing) {
    const now = performance.now() / 1000;
    const kick = Math.max(0, 1 - ((now * (122 / 60)) % 1) * 3);
    return Array.from({ length: count }, (_, i) =>
      Math.min(
        1,
        0.25 +
          kick * (1 - i / count) * 0.7 +
          Math.abs(Math.sin(now * 5 + i * 1.3)) * 0.3,
      ),
    );
  }
  return Array.from({ length: count }, () => 0);
};

import { content } from "../content/index.ts";
import { actions } from "./store.ts";

/** A bracketed value in content is a placeholder, not something to load. */
export const isPlaceholder = (v: string | undefined) =>
  !v || /^\[.*\]$/.test(v.trim());

let audio: HTMLAudioElement | null = null;
let analyser: AnalyserNode | null = null;
let bins: Uint8Array<ArrayBuffer> | null = null;
let smoothed = 0;

const ensure = () => {
  if (audio) return audio;
  const src = content.nowPlaying.audio;
  if (isPlaceholder(src) || !src) return null;
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

export const canPlay = () => !isPlaceholder(content.nowPlaying.audio);

export const toggleSong = async () => {
  const a = ensure();
  if (!a) {
    actions.toast("No song file yet — add one in content/now-playing.md");
    return;
  }
  if (a.paused) {
    try {
      await a.play();
    } catch {
      actions.toast("Couldn't start playback");
    }
  } else {
    a.pause();
  }
};

/** Bass-weighted level 0–1, smoothed. Cheap enough to call every frame. */
export const audioLevel = (): number => {
  if (!audio || audio.paused) {
    smoothed *= 0.9;
    return smoothed;
  }
  if (analyser && bins) {
    analyser.getByteFrequencyData(bins);
    let sum = 0;
    const n = Math.min(16, bins.length);
    for (let i = 0; i < n; i++) sum += bins[i] ?? 0;
    const level = sum / n / 255;
    smoothed += (level - smoothed) * 0.35;
  } else {
    // No analyser (e.g. cross-origin audio): fake a 120bpm pulse.
    const beat = (audio.currentTime * 2) % 1;
    smoothed = Math.max(0, 1 - beat * 3) * 0.8;
  }
  return smoothed;
};

/** Frequency bands 0–1 for a small meter. */
export const audioBands = (count: number): number[] => {
  if (!analyser || !bins || !audio || audio.paused)
    return Array.from({ length: count }, () => 0);
  analyser.getByteFrequencyData(bins);
  const per = Math.floor((bins.length * 0.7) / count);
  return Array.from({ length: count }, (_, i) => {
    let s = 0;
    for (let j = 0; j < per; j++) s += bins?.[i * per + j] ?? 0;
    return s / per / 255;
  });
};

/**
 * The tour's clock. The silent clock is always the source of truth: it can be
 * seeked instantly and can never be blocked by autoplay. The narration, when
 * there is one, follows it and is nudged back if it drifts.
 */

export interface Clock {
  play(): Promise<void>;
  pause(): void;
  seek(seconds: number): void;
  now(): number;
  dispose(): void;
}

export const createSilentClock = (): Clock => {
  let base = 0;
  let startedAt = 0;
  let running = false;

  const now = () =>
    running ? base + (performance.now() - startedAt) / 1000 : base;

  return {
    async play() {
      if (running) return;
      startedAt = performance.now();
      running = true;
    },
    pause() {
      if (!running) return;
      base = now();
      running = false;
    },
    seek(seconds) {
      base = Math.max(0, seconds);
      startedAt = performance.now();
    },
    now,
    dispose() {
      running = false;
    },
  };
};

/** The recording, kept in step with the clock rather than driving it. */
export interface Narration {
  play(): void;
  pause(): void;
  seek(seconds: number): void;
  /** Call every frame with the clock's time. */
  follow(seconds: number): void;
  dispose(): void;
}

const DRIFT = 0.3;
const RETRY_MS = 2000;

export const createNarration = (audio: HTMLAudioElement): Narration => {
  let lastAttempt = 0;

  return {
    play() {
      lastAttempt = performance.now();
      // A blocked autoplay is not an error: the tour still runs on captions.
      audio.play().catch(() => undefined);
    },
    pause() {
      audio.pause();
    },
    seek(seconds) {
      try {
        audio.currentTime = Math.max(0, seconds);
      } catch {
        // Metadata may not be ready; follow() will correct it.
      }
    },
    follow(seconds) {
      if (audio.readyState === 0) return;
      if (Math.abs(audio.currentTime - seconds) > DRIFT) {
        try {
          audio.currentTime = seconds;
        } catch {
          return;
        }
      }
      // Autoplay is often blocked until a gesture; a click on Resume is one.
      if (
        audio.paused &&
        !audio.ended &&
        performance.now() - lastAttempt > RETRY_MS
      ) {
        this.play();
      }
    },
    dispose() {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    },
  };
};

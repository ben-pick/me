/** Where the tour is up to, in seconds. */
export interface Clock {
  play(): void;
  /** Jump to a time and carry on playing from there. */
  seek(seconds: number): void;
  now(): number;
  stop(): void;
}

/**
 * The narration's playhead is the clock, so voice and visuals cannot drift and
 * a slow connection holds both. If the browser refuses to play it, a timer
 * takes over so the captions still run.
 */
export const createClock = (src: string): Clock => {
  const audio = new Audio(src);
  audio.preload = "auto";

  // Static hosting ignores range requests, so a streamed file can't be seeked.
  // Playback starts on the stream; seeking switches to a complete local copy.
  const download = fetch(src)
    .then((response) => response.blob())
    .then((blob) => URL.createObjectURL(blob))
    .catch(() => null);

  let seeking: number | null = null;
  let timerOrigin: number | null = null;

  const runOnTimer = (seconds: number) => {
    audio.pause();
    seeking = null;
    timerOrigin = performance.now() - seconds * 1000;
  };

  const play = () => {
    audio.play().catch((error: DOMException) => {
      if (error.name === "NotAllowedError") runOnTimer(audio.currentTime);
    });
  };

  return {
    play,
    seek(seconds) {
      if (timerOrigin !== null) {
        runOnTimer(seconds);
        return;
      }
      seeking = seconds;
      void download.then((local) => {
        if (seeking === null) return;
        if (!local) {
          runOnTimer(seeking);
          return;
        }
        if (audio.src !== local) audio.src = local;
        audio.currentTime = seeking;
        seeking = null;
        play();
      });
    },
    now() {
      if (seeking !== null) return seeking;
      return timerOrigin === null
        ? audio.currentTime
        : (performance.now() - timerOrigin) / 1000;
    },
    stop() {
      seeking = null;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      void download.then((local) => {
        if (local) URL.revokeObjectURL(local);
      });
    },
  };
};

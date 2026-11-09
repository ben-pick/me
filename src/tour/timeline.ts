/**
 * Tour timing, kept free of the DOM so it can be tested and replayed. Given a
 * time in seconds, `stateAt` returns everything the page should be showing, so
 * seeking needs no state of its own.
 */

export interface Beat {
  readonly on: string;
  readonly target?: string | undefined;
  readonly region?: string | undefined;
}

export interface Stop {
  readonly id: string;
  readonly target: string;
  readonly open?: string | undefined;
  readonly text: string;
  readonly beats?: ReadonlyArray<Beat> | undefined;
}

/** Written by `pnpm tour:audio` alongside the recording. */
export interface Timing {
  readonly duration: number;
  readonly stops: ReadonlyArray<{
    readonly id: string;
    readonly start: number;
    readonly end: number;
    readonly text: string;
  }>;
  readonly words: ReadonlyArray<{
    readonly word: string;
    readonly start: number;
    readonly end: number;
  }>;
}

interface TimelineBeat {
  readonly at: number;
  readonly target: string | null;
  readonly region: string | null;
}

interface TimelineStop {
  readonly start: number;
  readonly target: string;
  readonly open: string | null;
  readonly text: string;
  readonly beats: ReadonlyArray<TimelineBeat>;
}

export interface Timeline {
  readonly stops: ReadonlyArray<TimelineStop>;
  readonly duration: number;
}

export interface TourState {
  readonly stopIndex: number;
  readonly target: string;
  readonly open: string | null;
  readonly region: string | null;
  readonly caption: string;
}

const tokens = (text: string) =>
  text
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]+/gu, ""))
    .filter(Boolean);

/** When a phrase starts within a stop of the recording, if it was said. */
export const phraseTime = (
  phrase: string,
  span: { readonly start: number; readonly end: number },
  words: Timing["words"],
): number | null => {
  const spoken = words.filter(
    (word) => word.start >= span.start && word.start <= span.end,
  );
  const wanted = tokens(phrase);
  const said = spoken.map((word) => tokens(word.word).join(""));
  const index = said.findIndex((_, from) =>
    wanted.every((token, offset) => said[from + offset] === token),
  );
  return spoken[index]?.start ?? null;
};

/** Word times bunch up around pauses; a beat still needs time to register. */
const MIN_BEAT_SECONDS = 0.6;

const spaced = (beats: ReadonlyArray<TimelineBeat>) => {
  let earliest = Number.NEGATIVE_INFINITY;
  return beats.map((beat) => {
    const at = Math.max(beat.at, earliest);
    earliest = at + MIN_BEAT_SECONDS;
    return { ...beat, at };
  });
};

export const buildTimeline = (
  stops: ReadonlyArray<Stop>,
  timing: Timing,
): Timeline => ({
  duration: timing.duration,
  stops: stops.flatMap((stop) => {
    const span = timing.stops.find((recorded) => recorded.id === stop.id);
    if (!span) return [];
    return [
      {
        start: span.start,
        target: stop.target,
        open: stop.open ?? null,
        text: stop.text,
        beats: spaced(
          (stop.beats ?? [])
            .map((beat) => ({
              at: phraseTime(beat.on, span, timing.words) ?? span.start,
              target: beat.target ?? null,
              region: beat.region ?? null,
            }))
            .sort((a, b) => a.at - b.at),
        ),
      },
    ];
  }),
});

export const stateAt = (timeline: Timeline, seconds: number): TourState => {
  const stopIndex = Math.max(
    0,
    timeline.stops.findLastIndex((stop) => stop.start <= seconds),
  );
  const stop = timeline.stops[stopIndex];
  let target = stop?.target ?? "";
  let region: string | null = null;
  for (const beat of stop?.beats ?? []) {
    if (beat.at > seconds) break;
    target = beat.target ?? target;
    region = beat.region ?? region;
  }
  return {
    stopIndex,
    target,
    open: stop?.open ?? null,
    region,
    caption: stop?.text ?? "",
  };
};

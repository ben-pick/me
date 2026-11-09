/**
 * Tour timing, kept free of the DOM so it can be tested and replayed. The audio
 * position is the only clock: given a time in seconds, `stateAt` returns the
 * complete state the page should be in, which makes seeking idempotent.
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

export interface TimingWord {
  readonly word: string;
  readonly start: number;
  readonly end: number;
}

export interface Timing {
  readonly duration: number;
  readonly words: ReadonlyArray<TimingWord>;
}

export interface TimelineStop {
  readonly id: string;
  readonly target: string;
  readonly open: string | null;
  readonly text: string;
  readonly start: number;
  readonly end: number;
  readonly index: number;
  /** Share of the stop's words found in the recording; 1 when estimated. */
  readonly coverage: number;
}

export interface TimelineBeat {
  readonly stopId: string;
  readonly stopIndex: number;
  /** Seconds into the tour. */
  readonly at: number;
  readonly target: string | null;
  readonly region: string | null;
}

export interface Timeline {
  readonly stops: ReadonlyArray<TimelineStop>;
  readonly beats: ReadonlyArray<TimelineBeat>;
  readonly duration: number;
  /** True when word timings were used instead of the word-count estimate. */
  readonly timed: boolean;
}

export interface TourState {
  readonly stopId: string;
  readonly stopIndex: number;
  readonly target: string;
  readonly open: string | null;
  readonly region: string | null;
  readonly caption: string;
  readonly seconds: number;
  readonly progress: number;
  readonly ended: boolean;
}

/** 140 words per minute, plus a breath between stops. */
const WORDS_PER_SECOND = 140 / 60;
const STOP_GAP = 0.45;

interface Token {
  readonly norm: string;
}

const normalize = (word: string) =>
  word
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}]+/gu, "");

const tokenize = (text: string): Token[] => {
  const tokens: Token[] = [];
  for (const match of text.matchAll(/\S+/g)) {
    const norm = normalize(match[0]);
    if (norm) tokens.push({ norm });
  }
  return tokens;
};

interface Preparation {
  readonly stop: Stop;
  readonly tokens: ReadonlyArray<Token>;
  /** Index into the timing words for each token, when aligned. */
  readonly words: ReadonlyArray<number | null>;
  readonly start: number;
  readonly end: number;
  readonly coverage: number;
}

/** How far ahead a word may be found, so a dropped word can't skip whole stops. */
const LOOKAHEAD = 12;

const align = (
  target: ReadonlyArray<Token>,
  words: ReadonlyArray<string>,
  from: number,
): { indices: Array<number | null>; cursor: number; matched: number } => {
  let cursor = from;
  let matched = 0;
  const indices: Array<number | null> = [];
  for (const token of target) {
    const limit = Math.min(words.length, cursor + LOOKAHEAD);
    let i = cursor;
    while (i < limit && words[i] !== token.norm) i++;
    if (i < limit) {
      indices.push(i);
      cursor = i + 1;
      matched++;
    } else {
      indices.push(null);
    }
  }
  return { indices, cursor, matched };
};

const estimate = (stops: ReadonlyArray<Stop>): Preparation[] => {
  let cursor = 0;
  return stops.map((stop) => {
    const tokens = tokenize(stop.text);
    const start = cursor;
    const end = start + Math.max(1, tokens.length) / WORDS_PER_SECOND;
    cursor = end + STOP_GAP;
    return {
      stop,
      tokens,
      words: tokens.map(() => null),
      start,
      end,
      coverage: 1,
    };
  });
};

const prepare = (
  stops: ReadonlyArray<Stop>,
  timing: Timing,
): { prepared: Preparation[]; words: ReadonlyArray<TimingWord> } => {
  const words = timing.words;
  const normalized = words.map((word) => normalize(word.word));
  let cursor = 0;
  let previousEnd = 0;

  const prepared = stops.map((stop) => {
    const tokens = tokenize(stop.text);
    const aligned = align(tokens, normalized, cursor);
    cursor = aligned.cursor;

    const first = aligned.indices.findIndex((i) => i !== null);
    const last = aligned.indices.reduce<number>(
      (found, i, index) => (i !== null ? index : found),
      -1,
    );
    const firstWordIndex = first >= 0 ? (aligned.indices[first] ?? null) : null;
    const lastWordIndex = last >= 0 ? (aligned.indices[last] ?? null) : null;
    const firstWord =
      firstWordIndex === null ? undefined : words[firstWordIndex];
    const lastWord = lastWordIndex === null ? undefined : words[lastWordIndex];

    let start: number;
    let end: number;
    if (firstWord && lastWord) {
      start = Math.max(previousEnd, firstWord.start);
      end = Math.max(start, lastWord.end);
    } else {
      // This stop was not in the recording; keep the order and use the estimate.
      start = previousEnd + STOP_GAP;
      end = start + Math.max(1, tokens.length) / WORDS_PER_SECOND;
    }
    previousEnd = end;

    return {
      stop,
      tokens,
      words: aligned.indices,
      start,
      end,
      coverage: tokens.length > 0 ? aligned.matched / tokens.length : 1,
    };
  });

  return { prepared, words };
};

const findPhrase = (
  haystack: ReadonlyArray<string>,
  needle: ReadonlyArray<string>,
): number => {
  if (needle.length === 0 || needle.length > haystack.length) return -1;
  for (let i = 0; i <= haystack.length - needle.length; i++) {
    let match = true;
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) {
        match = false;
        break;
      }
    }
    if (match) return i;
  }
  return -1;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const beatTime = (
  preparation: Preparation,
  beat: Beat,
  index: number,
  count: number,
  timed: boolean,
  words: ReadonlyArray<TimingWord>,
): number => {
  const phrase = tokenize(beat.on).map((token) => token.norm);
  const position = findPhrase(
    preparation.tokens.map((token) => token.norm),
    phrase,
  );

  if (position >= 0) {
    if (timed) {
      for (let i = position; i < preparation.words.length; i++) {
        const wordIndex = preparation.words[i];
        const word =
          wordIndex === null || wordIndex === undefined
            ? undefined
            : words[wordIndex];
        if (word) return clamp(word.start, preparation.start, preparation.end);
      }
      // The phrase itself was not in the timing; place it by word position.
      const fraction =
        preparation.tokens.length > 1
          ? position / preparation.tokens.length
          : 0;
      return clamp(
        preparation.start + fraction * (preparation.end - preparation.start),
        preparation.start,
        preparation.end,
      );
    }
    return clamp(
      preparation.start + position / WORDS_PER_SECOND,
      preparation.start,
      preparation.end,
    );
  }

  // A beat that does not name its phrase still fires, evenly spaced.
  const fraction = (index + 1) / (count + 1);
  return clamp(
    preparation.start + fraction * (preparation.end - preparation.start),
    preparation.start,
    preparation.end,
  );
};

const emptyTimeline = (timed: boolean): Timeline => ({
  stops: [],
  beats: [],
  duration: 0,
  timed,
});

export const buildTimeline = (
  stops: ReadonlyArray<Stop>,
  timing?: Timing | null,
): Timeline => {
  if (stops.length === 0) return emptyTimeline(false);

  const timed =
    timing !== undefined &&
    timing !== null &&
    timing.words.length > 0 &&
    timing.duration > 0;
  const words = timed ? (timing?.words ?? []) : [];
  const prepared = timed
    ? prepare(stops, timing as Timing).prepared
    : estimate(stops);
  const last = prepared[prepared.length - 1];
  const duration = Math.max(
    timed ? (timing?.duration ?? 0) : 0,
    last?.end ?? 0,
    last?.start ?? 0,
  );

  const timelineStops: TimelineStop[] = prepared.map((item, index) => {
    const next = prepared[index + 1];
    return {
      id: item.stop.id,
      target: item.stop.target,
      open: item.stop.open ?? null,
      text: item.stop.text,
      start: item.start,
      end: next ? Math.max(item.start, next.start) : duration,
      index,
      coverage: item.coverage,
    };
  });

  const beats: TimelineBeat[] = [];
  prepared.forEach((item, stopIndex) => {
    const stop = timelineStops[stopIndex];
    if (!stop || !item.stop.beats) return;
    item.stop.beats.forEach((beat, index) => {
      beats.push({
        stopId: item.stop.id,
        stopIndex,
        at: beatTime(
          item,
          beat,
          index,
          item.stop.beats?.length ?? 1,
          timed,
          words,
        ),
        target: beat.target ?? null,
        region: beat.region ?? null,
      });
    });
  });
  beats.sort((a, b) => a.stopIndex - b.stopIndex || a.at - b.at);

  // Two beats landing together would swallow each other, so give each one room.
  const spaced: TimelineBeat[] = [];
  for (const beat of beats) {
    const previous = spaced[spaced.length - 1];
    const stop = timelineStops[beat.stopIndex];
    if (!stop) continue;
    const earliest =
      previous && previous.stopIndex === beat.stopIndex
        ? previous.at + 0.45
        : Number.NEGATIVE_INFINITY;
    const latest = Math.max(stop.start, stop.end - 0.2);
    spaced.push({
      ...beat,
      at: Math.min(Math.max(beat.at, earliest), latest),
    });
  }

  return {
    stops: timelineStops,
    beats: spaced,
    duration,
    timed,
  };
};

const emptyState = (): TourState => ({
  stopId: "",
  stopIndex: 0,
  target: "",
  open: null,
  region: null,
  caption: "",
  seconds: 0,
  progress: 0,
  ended: true,
});

export const stateAt = (timeline: Timeline, seconds: number): TourState => {
  if (timeline.stops.length === 0) return emptyState();

  const duration = Math.max(0, timeline.duration);
  const time = Number.isNaN(seconds)
    ? 0
    : Math.min(Math.max(seconds, 0), duration);

  let stopIndex = 0;
  for (let i = 0; i < timeline.stops.length; i++) {
    const stop = timeline.stops[i];
    if (stop && stop.start <= time) stopIndex = i;
    else break;
  }
  const stop = timeline.stops[stopIndex];
  if (!stop) return emptyState();

  let target = stop.target;
  let region: string | null = null;
  for (const beat of timeline.beats) {
    if (beat.stopIndex !== stopIndex) continue;
    if (beat.at > time) break;
    if (beat.target !== null) target = beat.target;
    if (beat.region !== null) region = beat.region;
  }

  return {
    stopId: stop.id,
    stopIndex,
    target,
    open: stop.open,
    region,
    caption: stop.text,
    seconds: time,
    progress: duration > 0 ? time / duration : 0,
    ended: time >= duration,
  };
};

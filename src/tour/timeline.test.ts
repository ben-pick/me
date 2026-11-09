import { describe, expect, it } from "vitest";
import { buildTimeline, type Stop, stateAt, type Timing } from "./timeline.ts";

const stops: Stop[] = [
  { id: "one", target: "hero", text: "One two three four five." },
  {
    id: "two",
    target: "kodo",
    open: "kodo",
    text: "Six seven eight.",
    beats: [{ on: "seven", target: "commbank-staff" }],
  },
  { id: "three", target: "contact", text: "Nine ten." },
];

describe("buildTimeline", () => {
  it("estimates from word counts at 140 words per minute", () => {
    const timeline = buildTimeline(stops);

    expect(timeline.timed).toBe(false);
    expect(timeline.stops).toHaveLength(3);
    expect(timeline.stops[0]?.start).toBe(0);
    expect(timeline.stops[1]?.start).toBeGreaterThan(
      timeline.stops[0]?.start ?? 0,
    );
    expect(timeline.stops[2]?.start).toBeGreaterThan(
      timeline.stops[1]?.start ?? 0,
    );
    expect(timeline.duration).toBeGreaterThan(timeline.stops[2]?.start ?? 0);

    // Five words at 140wpm is ~2.14s, then a short gap.
    expect(timeline.stops[1]?.start).toBeCloseTo(5 / (140 / 60) + 0.45, 5);
  });

  it("aligns stops to word timings, tolerating case and punctuation", () => {
    const timing: Timing = {
      duration: 4,
      words: [
        { word: "ONE,", start: 0.1, end: 0.3 },
        { word: "two!", start: 0.35, end: 0.5 },
        { word: "THREE", start: 0.6, end: 0.8 },
        { word: "four.", start: 0.9, end: 1.1 },
        { word: "five", start: 1.2, end: 1.4 },
        { word: "SIX,", start: 2, end: 2.2 },
        { word: "seven!", start: 2.2, end: 2.4 },
        { word: "eight.", start: 2.5, end: 2.8 },
      ],
    };
    const timeline = buildTimeline(
      [
        { id: "one", target: "hero", text: "One two three four five." },
        { id: "two", target: "contact", text: "Six seven eight." },
      ],
      timing,
    );

    expect(timeline.timed).toBe(true);
    expect(timeline.stops[0]?.start).toBe(0.1);
    expect(timeline.stops[1]?.start).toBe(2);
    expect(stateAt(timeline, 0).stopId).toBe("one");
    expect(stateAt(timeline, 1.5).stopId).toBe("one");
    expect(stateAt(timeline, 2).stopId).toBe("two");
  });

  it("finds each stop's repeated words in order", () => {
    const timing: Timing = {
      duration: 5,
      words: [
        { word: "one", start: 0, end: 0.2 },
        { word: "two", start: 1, end: 1.2 },
        { word: "two", start: 2, end: 2.2 },
        { word: "three", start: 3, end: 3.2 },
      ],
    };
    const timeline = buildTimeline(
      [
        { id: "a", target: "hero", text: "One two." },
        { id: "b", target: "contact", text: "Two three." },
      ],
      timing,
    );

    expect(timeline.stops[0]?.start).toBe(0);
    expect(timeline.stops[1]?.start).toBe(2);
    expect(stateAt(timeline, 2.5).stopId).toBe("b");
  });

  it("does not let a dropped word skip ahead to a later stop", () => {
    const script: Stop[] = [
      { id: "a", target: "hero", text: "for about two minutes" },
      {
        id: "b",
        target: "kodo",
        text: "w1 w2 w3 w4 w5 w6 w7 w8 w9 w10 w11 w12 w13 w14",
      },
      { id: "c", target: "contact", text: "know anything about cloud" },
    ];
    const spoken =
      "for two minutes w1 w2 w3 w4 w5 w6 w7 w8 w9 w10 w11 w12 w13 w14 know anything about cloud".split(
        " ",
      );
    const timeline = buildTimeline(script, {
      duration: spoken.length,
      words: spoken.map((word, i) => ({ word, start: i, end: i + 0.5 })),
    });

    expect(timeline.stops[1]?.start).toBe(3);
    expect(timeline.stops[2]?.start).toBe(17);
  });

  it("places beats on their phrase's word", () => {
    const timing: Timing = {
      duration: 4,
      words: [
        { word: "Hello", start: 0, end: 0.3 },
        { word: "bouldering,", start: 1, end: 1.3 },
        { word: "and", start: 1.4, end: 1.5 },
        { word: "gaming.", start: 2, end: 2.3 },
      ],
    };
    const timeline = buildTimeline(
      [
        {
          id: "brain",
          target: "brain",
          text: "Hello bouldering, and gaming.",
          beats: [
            { on: "bouldering", region: "bouldering" },
            { on: "gaming", region: "gaming" },
          ],
        },
      ],
      timing,
    );

    expect(timeline.beats.map((beat) => beat.at)).toEqual([1, 2]);
    expect(stateAt(timeline, 0.5).region).toBeNull();
    expect(stateAt(timeline, 1.2).region).toBe("bouldering");
    expect(stateAt(timeline, 2.2).region).toBe("gaming");
  });

  it("fires beats that name no phrase anyway, evenly spaced", () => {
    const timeline = buildTimeline([
      {
        id: "one",
        target: "hero",
        text: "One two three four.",
        beats: [
          { on: "not in the text", target: "kodo" },
          { on: "also missing", target: "contact" },
        ],
      },
    ]);

    expect(timeline.beats).toHaveLength(2);
    expect(timeline.beats[0]?.at).toBeGreaterThan(0);
    expect(timeline.beats[1]?.at).toBeGreaterThan(timeline.beats[0]?.at ?? 0);
    expect(timeline.beats[1]?.at).toBeLessThan(timeline.duration);
  });
});

describe("beats", () => {
  it("spaces beats that share a timestamp", () => {
    const script: Stop[] = [
      {
        id: "brain",
        target: "brain",
        text: "bouldering gaming streetwear",
        beats: [
          { on: "bouldering", region: "bouldering" },
          { on: "gaming", region: "gaming" },
          { on: "streetwear", region: "streetwear" },
        ],
      },
    ];
    const timeline = buildTimeline(script, {
      duration: 3,
      words: [
        { word: "bouldering", start: 0.5, end: 0.9 },
        { word: "gaming", start: 0.9, end: 0.9 },
        { word: "streetwear", start: 0.9, end: 1.3 },
      ],
    });
    const times = timeline.beats.map((beat) => beat.at);
    expect(times[1]! - times[0]!).toBeCloseTo(0.45, 5);
    expect(times[2]! - times[1]!).toBeCloseTo(0.45, 5);
  });
});

describe("stateAt", () => {
  const timeline = buildTimeline(stops);
  const beat = timeline.beats[0];
  const afterBeat = (beat?.at ?? 0) + 0.01;

  it("returns the complete state, including the state before any beat", () => {
    expect(stateAt(timeline, 0)).toMatchObject({
      stopId: "one",
      stopIndex: 0,
      target: "hero",
      open: null,
      region: null,
      caption: stops[0]?.text,
    });
    expect(stateAt(timeline, timeline.stops[1]?.start ?? 0)).toMatchObject({
      stopId: "two",
      target: "kodo",
      open: "kodo",
    });
  });

  it("applies a beat's target and resets on the next stop", () => {
    expect(stateAt(timeline, afterBeat).target).toBe("commbank-staff");
    expect(stateAt(timeline, timeline.stops[2]?.start ?? 0)).toMatchObject({
      stopId: "three",
      target: "contact",
      open: null,
    });
  });

  it("is idempotent when seeking forwards and backwards", () => {
    const first = stateAt(timeline, afterBeat);
    expect(stateAt(timeline, afterBeat)).toEqual(first);

    const earlier = stateAt(timeline, 0.2);
    stateAt(timeline, timeline.duration);
    expect(stateAt(timeline, 0.2)).toEqual(earlier);
  });

  it("clamps before the start and after the end", () => {
    expect(stateAt(timeline, -10)).toEqual(stateAt(timeline, 0));
    const end = stateAt(timeline, timeline.duration + 10);
    expect(end.ended).toBe(true);
    expect(end.progress).toBe(1);
    expect(stateAt(timeline, Number.NaN)).toEqual(stateAt(timeline, 0));
  });

  it("does not throw without stops", () => {
    const empty = buildTimeline([]);
    expect(stateAt(empty, 3)).toMatchObject({ stopId: "", ended: true });
  });
});

import { describe, expect, it } from "vitest";
import {
  buildTimeline,
  phraseTime,
  type Stop,
  stateAt,
  type Timing,
} from "./timeline.ts";

const stops: Stop[] = [
  { id: "one", target: "hero", text: "One two." },
  {
    id: "two",
    target: "kodo",
    open: "kodo",
    text: "Three four.",
    beats: [
      { on: "four", target: "quantium", region: "tech" },
      { on: "three", region: "gaming" },
    ],
  },
  { id: "three", target: "contact", text: "Five." },
];

const timing: Timing = {
  duration: 6,
  stops: [
    { id: "one", start: 0, end: 1.5, text: "One two." },
    { id: "two", start: 2, end: 4, text: "Three four." },
    { id: "three", start: 4.5, end: 6, text: "Five." },
  ],
  words: [
    { word: "One", start: 0, end: 0.5 },
    { word: "two.", start: 0.5, end: 1.5 },
    { word: "Three,", start: 2.5, end: 3 },
    { word: "four", start: 3.5, end: 4 },
    { word: "Five", start: 4.5, end: 6 },
  ],
};

const timeline = buildTimeline(stops, timing);

describe("phraseTime", () => {
  it("ignores case and punctuation, and spans several words", () => {
    const span = { start: 0, end: 4 };
    expect(phraseTime("three", span, timing.words)).toBe(2.5);
    expect(phraseTime("TWO three", span, timing.words)).toBe(0.5);
  });

  it("only looks inside the stop's span", () => {
    expect(phraseTime("five", { start: 0, end: 4 }, timing.words)).toBeNull();
  });
});

describe("stateAt", () => {
  it("uses the recorded stop boundaries, holding through the gap", () => {
    expect(stateAt(timeline, 0).target).toBe("hero");
    expect(stateAt(timeline, 1.9).stopIndex).toBe(0);
    expect(stateAt(timeline, 2).stopIndex).toBe(1);
    expect(stateAt(timeline, 2).open).toBe("kodo");
  });

  it("applies beats in spoken order, and resets on the next stop", () => {
    expect(stateAt(timeline, 2).region).toBeNull();
    expect(stateAt(timeline, 2.6).region).toBe("gaming");
    expect(stateAt(timeline, 3.6).region).toBe("tech");
    expect(stateAt(timeline, 3.6).target).toBe("quantium");
    expect(stateAt(timeline, 4.6).region).toBeNull();
    expect(stateAt(timeline, 4.6).target).toBe("contact");
  });

  it("gives the same state whichever way it is reached", () => {
    const direct = stateAt(timeline, 3.6);
    stateAt(timeline, 5);
    stateAt(timeline, 0);
    expect(stateAt(timeline, 3.6)).toEqual(direct);
  });

  it("clamps before the first stop", () => {
    expect(stateAt(timeline, -1).stopIndex).toBe(0);
  });
});

describe("buildTimeline", () => {
  it("falls back to the start of the stop for an unspoken beat", () => {
    const built = buildTimeline(
      [{ ...stops[0], beats: [{ on: "never said", region: "tech" }] } as Stop],
      timing,
    );
    expect(stateAt(built, 0).region).toBe("tech");
  });

  it("gives beats that land together time to register", () => {
    const built = buildTimeline(
      [
        {
          ...stops[1],
          beats: [
            { on: "three", region: "gaming" },
            { on: "four", region: "tech" },
          ],
        } as Stop,
      ],
      {
        ...timing,
        words: [
          { word: "three", start: 2.5, end: 2.6 },
          { word: "four", start: 2.6, end: 2.7 },
        ],
      },
    );
    expect(stateAt(built, 2.8).region).toBe("gaming");
    expect(stateAt(built, 3.1).region).toBe("tech");
  });

  it("leaves out a stop with no recording", () => {
    const built = buildTimeline(
      [...stops, { id: "new", target: "hero", text: "Later." }],
      timing,
    );
    expect(built.stops).toHaveLength(3);
  });
});

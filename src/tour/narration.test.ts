import { describe, expect, it } from "vitest";
import tour from "../../content/tour.json";
import timing from "../../content/tour-timing.json";
import { phraseTime } from "./timeline.ts";

describe("the recording", () => {
  it("matches the script, stop for stop", () => {
    expect(
      timing.stops.map(({ id, text }) => ({ id, text })),
      "The script changed. Re-record the stop if needed, then run `pnpm tour:audio`.",
    ).toEqual(tour.stops.map(({ id, text }) => ({ id, text })));
  });

  it("runs in order and ends with the track", () => {
    timing.stops.forEach((stop, i) => {
      expect(stop.end).toBeGreaterThan(stop.start);
      expect(stop.start).toBeGreaterThanOrEqual(timing.stops[i - 1]?.end ?? 0);
    });
    expect(timing.stops.at(-1)?.end).toBeCloseTo(timing.duration, 0);
  });

  it("says every phrase a beat is waiting for", () => {
    for (const stop of tour.stops) {
      const span = timing.stops.find((s) => s.id === stop.id);
      if (!span) throw new Error(`No recording for ${stop.id}`);
      for (const beat of "beats" in stop ? stop.beats : []) {
        expect(
          phraseTime(beat.on, span, timing.words),
          `"${beat.on}" was not found in ${stop.id}`,
        ).not.toBeNull();
      }
    }
  });
});

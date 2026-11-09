import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import tour from "../../content/tour.json" with { type: "json" };
import { buildTimeline, type Timing } from "./timeline.ts";

const timingFile = "public/tour/timing.json";
const timing = existsSync(timingFile)
  ? (JSON.parse(readFileSync(timingFile, "utf8")) as Timing)
  : null;

/**
 * These checks assume whisper's word timings are roughly right, not that its
 * spelling is: it splits names like "Kodo" into "K odo", so comparing words
 * per stop would fail on a perfectly good recording.
 */
describe("narration", () => {
  it.skipIf(!timing)("has a timed stop for every line of the script", () => {
    const timeline = buildTimeline(tour.stops, timing);
    expect(timeline.timed).toBe(true);
    expect(timeline.stops).toHaveLength(tour.stops.length);
    for (const stop of timeline.stops) {
      expect(stop.end - stop.start, `${stop.id} has no time`).toBeGreaterThan(
        1.5,
      );
      expect(stop.end - stop.start, `${stop.id} runs long`).toBeLessThan(30);
    }
  });

  it.skipIf(!timing)(
    "keeps the stops in order and covers the recording",
    () => {
      const timeline = buildTimeline(tour.stops, timing);
      for (let i = 0; i < timeline.stops.length - 1; i++) {
        const stop = timeline.stops[i];
        const next = timeline.stops[i + 1];
        if (!stop || !next) continue;
        expect(next.start).toBeGreaterThan(stop.start);
        expect(next.start - stop.start).toBeLessThan(30);
      }
      const last = timeline.stops[timeline.stops.length - 1];
      expect(last?.start ?? 0).toBeLessThan(timeline.duration);
      expect(timeline.duration).toBeCloseTo(timing?.duration ?? 0, 0);
    },
  );
});

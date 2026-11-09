import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import tour from "../../content/tour.json" with { type: "json" };
import { buildTimeline, type Timing } from "./timeline.ts";

const timingFile = "public/tour/timing.json";
const timing = existsSync(timingFile)
  ? (JSON.parse(readFileSync(timingFile, "utf8")) as Timing)
  : null;

describe("narration", () => {
  it.skipIf(!timing)("covers every stop in the script", () => {
    const timeline = buildTimeline(tour.stops, timing);
    expect(timeline.timed).toBe(true);
    for (const stop of timeline.stops) {
      // A re-recording that skips or rewords a line shows up here.
      expect(
        stop.coverage,
        `${stop.id} is not fully in the recording`,
      ).toBeGreaterThanOrEqual(0.8);
    }
  });

  it.skipIf(!timing)("keeps a short pause between stops", () => {
    const timeline = buildTimeline(tour.stops, timing);
    for (let i = 0; i < timeline.stops.length - 1; i++) {
      const stop = timeline.stops[i];
      const next = timeline.stops[i + 1];
      if (!stop || !next) continue;
      expect(next.start - stop.end).toBeGreaterThanOrEqual(0);
      expect(next.start - stop.end).toBeLessThan(1.5);
    }
  });
});

import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadContent } from "./parse.ts";

const content = loadContent(resolve("content"));
const companySlugs = new Set(content.companies.map((company) => company.slug));
const regions = new Set(content.interests.map((interest) => interest.slug));
const tourTargets = new Set([
  "hero",
  "brain",
  "contact",
  ...companySlugs,
  ...content.projects.map((project) => project.slug),
]);

describe("content/tour.json", () => {
  it("validates against the Effect schema", () => {
    expect(content.tour.stops.map((stop) => stop.id)).toEqual([
      "hero",
      "kodo",
      "commbank-staff",
      "commbank-senior",
      "experience",
      "project",
      "brain",
      "contact",
    ]);
  });

  it("points every stop at a real target and company", () => {
    for (const stop of content.tour.stops) {
      expect(stop.text.length).toBeGreaterThan(0);
      expect(tourTargets.has(stop.target)).toBe(true);
      if (stop.open) expect(companySlugs.has(stop.open)).toBe(true);
    }
  });

  it("keeps every beat tied to its phrase and to real targets", () => {
    for (const stop of content.tour.stops) {
      for (const beat of stop.beats ?? []) {
        expect(stop.text.toLowerCase()).toContain(beat.on.toLowerCase());
        if (beat.target) expect(tourTargets.has(beat.target)).toBe(true);
        if (beat.region) expect(regions.has(beat.region)).toBe(true);
      }
    }
  });

  it("leaves the experience modals closed and sweeps the rows", () => {
    const experience = content.tour.stops.find(
      (stop) => stop.id === "experience",
    );
    expect(experience?.open).toBeUndefined();
    expect(experience?.beats?.map((beat) => beat.target)).toEqual([
      "quantium",
      "school-bytes",
      "data61",
      "ibm",
    ]);
  });
});

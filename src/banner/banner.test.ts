import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { bannerFingerprint } from "./fingerprint.ts";

it("design/linkedin-banner.png is up to date with the site", () => {
  const rendered = readFileSync(
    "design/linkedin-banner.fingerprint",
    "utf8",
  ).trim();
  expect(
    rendered,
    "The banner is stale. Run `pnpm banner`, commit it and re-upload to LinkedIn.",
  ).toBe(bannerFingerprint());
});

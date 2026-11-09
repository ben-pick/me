import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { bannerModel } from "./model.ts";

/** Changes whenever the banner's content, layout or the site's tokens change. */
export const bannerFingerprint = () =>
  createHash("sha256")
    .update(
      JSON.stringify([
        bannerModel(),
        readFileSync("src/banner/Banner.tsx", "utf8"),
        readFileSync("src/styles.css", "utf8"),
      ]),
    )
    .digest("hex");

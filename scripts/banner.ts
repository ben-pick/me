/**
 * Renders src/banner to design/linkedin-banner.png and records what it was
 * rendered from, so `pnpm test` fails when the PNG falls behind the site.
 * LinkedIn has no API for this, so the PNG still has to be uploaded by hand.
 */
import { execFile, execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { createServer } from "vite";
import { contentPlugin } from "../src/content/plugin.ts";

const PNG = "design/linkedin-banner.png";
const FINGERPRINT = "design/linkedin-banner.fingerprint";

const findChrome = () => {
  const cached = join(homedir(), ".cache/puppeteer/chrome-headless-shell");
  const fromCache = existsSync(cached)
    ? readdirSync(cached)
        .sort()
        .reverse()
        .flatMap((v) =>
          readdirSync(join(cached, v)).map((p) =>
            join(cached, v, p, "chrome-headless-shell"),
          ),
        )
    : [];
  const found = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    ...fromCache,
  ].find((p) => p && existsSync(p));
  if (!found) throw new Error("No Chrome found. Set CHROME_PATH.");
  return found;
};

const server = await createServer({
  configFile: false,
  logLevel: "error",
  appType: "mpa",
  // Its own cache, so a running `pnpm dev` isn't invalidated.
  cacheDir: "node_modules/.vite-banner",
  // No live-reload socket: an open one stops headless Chrome from settling.
  server: { hmr: false, ws: false },
  plugins: [contentPlugin(), viteReact(), tailwindcss()],
  optimizeDeps: {
    noDiscovery: true,
    include: ["react", "react/jsx-dev-runtime", "react-dom/client"],
  },
});

const dir = mkdtempSync(join(tmpdir(), "banner-"));
try {
  await server.listen();
  const origin = server.resolvedUrls?.local[0];
  if (!origin) throw new Error("The banner server has no URL");
  const { bannerFingerprint } = await server.ssrLoadModule(
    "/src/banner/fingerprint.ts",
  );
  const next = `${bannerFingerprint()}\n`;
  const shot = join(dir, "banner.png");
  // Async: the Vite server in this process has to answer Chrome's requests.
  await promisify(execFile)(
    findChrome(),
    [
      "--headless",
      "--hide-scrollbars",
      "--window-size=1584,396",
      "--force-device-scale-factor=2",
      "--virtual-time-budget=20000",
      `--screenshot=${shot}`,
      `${origin}src/banner/index.html`,
    ],
    { timeout: 60_000 },
  );
  // Rendered at 2× and scaled down for cleaner type on LinkedIn.
  execFileSync("sips", ["-z", "396", "1584", shot, "--out", PNG], {
    stdio: "ignore",
  });
  const changed =
    !existsSync(FINGERPRINT) || readFileSync(FINGERPRINT, "utf8") !== next;
  writeFileSync(FINGERPRINT, next);
  console.log(
    changed
      ? `${PNG} changed: commit it and re-upload it to LinkedIn.`
      : `${PNG} is already up to date.`,
  );
} finally {
  await server.close();
  rmSync(dir, { recursive: true, force: true });
}

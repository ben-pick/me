import { defineConfig } from "vitest/config";
import { contentPlugin } from "./src/content/plugin.ts";
import { tourAssetsPlugin } from "./src/tour/plugin.ts";

export default defineConfig({
  plugins: [contentPlugin(), tourAssetsPlugin()],
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});

import { defineConfig } from "vitest/config";
import { contentPlugin } from "./src/content/plugin.ts";

export default defineConfig({
  plugins: [contentPlugin()],
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});

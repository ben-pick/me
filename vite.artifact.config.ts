import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { contentPlugin } from "./src/content/plugin.ts";
import { tourAssetsPlugin } from "./src/tour/plugin.ts";

/** Static client-only bundle with relative paths, for hosting as an artifact. */
export default defineConfig({
  base: "./",
  plugins: [contentPlugin(), tourAssetsPlugin(), viteReact(), tailwindcss()],
  build: {
    outDir: "dist-artifact",
    emptyOutDir: true,
    rollupOptions: {
      input: { main: "src/artifact/main.tsx" },
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});

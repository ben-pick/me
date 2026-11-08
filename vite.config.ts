import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { contentPlugin } from "./src/content/plugin.ts";

export default defineConfig({
  plugins: [
    contentPlugin(),
    cloudflare({ viteEnvironment: { name: "ssr" }, remoteBindings: false }),
    tanstackStart(),
    viteReact(),
    tailwindcss(),
  ],
});

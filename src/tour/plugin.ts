import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";

const ID = "virtual:tour-assets";
const RESOLVED = `\0${ID}`;

/**
 * Tells the tour whether a real recording exists. Checking at build time keeps
 * the silent tour from requesting files that are not there yet.
 */
export const tourAssetsPlugin = (publicDir = "public"): Plugin => {
  const publicRoot = resolve(publicDir);
  const tourRoot = resolve(publicRoot, "tour");
  return {
    name: "portfolio-tour-assets",
    resolveId: (id) => (id === ID ? RESOLVED : undefined),
    load(id) {
      if (id !== RESOLVED) return undefined;
      // A version makes a re-recording impossible to serve from cache.
      const stamp = (name: string) => {
        const file = resolve(tourRoot, name);
        return existsSync(file) ? Math.round(statSync(file).mtimeMs) : 0;
      };
      return `export default ${JSON.stringify({
        audio: existsSync(resolve(tourRoot, "narration.mp3")),
        timing: existsSync(resolve(tourRoot, "timing.json")),
        version: `${stamp("narration.mp3")}-${stamp("timing.json")}`,
      })};`;
    },
    configureServer(server) {
      server.watcher.add(publicRoot);
      server.watcher.on("all", (_event, file) => {
        if (!file.startsWith(tourRoot)) return;
        for (const env of Object.values(server.environments)) {
          const mod = env.moduleGraph.getModuleById(RESOLVED);
          if (mod) env.moduleGraph.invalidateModule(mod);
        }
        server.ws.send({ type: "full-reload" });
      });
    },
  };
};

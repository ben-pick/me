import { resolve } from "node:path";
import type { Plugin } from "vite";
import { loadContent } from "./parse.ts";

const ID = "virtual:content";
const RESOLVED = `\0${ID}`;

/**
 * Exposes `content/**\/*.md` as `virtual:content`. Parsing and validation run
 * at build time in Node, so the browser only receives JSON.
 */
export const contentPlugin = (dir = "content"): Plugin => {
  const root = resolve(dir);
  return {
    name: "portfolio-content",
    resolveId: (id) => (id === ID ? RESOLVED : undefined),
    load(id) {
      if (id !== RESOLVED) return undefined;
      return `export default ${JSON.stringify(loadContent(root))};`;
    },
    configureServer(server) {
      server.watcher.add(root);
      server.watcher.on("all", (_event, file) => {
        if (!file.startsWith(root)) return;
        for (const env of Object.values(server.environments)) {
          const mod = env.moduleGraph.getModuleById(RESOLVED);
          if (mod) env.moduleGraph.invalidateModule(mod);
        }
        server.ws.send({ type: "full-reload" });
      });
    },
  };
};

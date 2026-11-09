import { createFileRoute } from "@tanstack/react-router";
import { content } from "../content/index.ts";
import { sitemapXml } from "../lib/seo.ts";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () =>
        new Response(sitemapXml(content), {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        }),
    },
  },
});

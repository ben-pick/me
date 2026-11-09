import type { Content, Site } from "../content/types.ts";

type HasUrl = Pick<Site, "url">;

/** Always the production origin, so previews never advertise their own URLs. */
export const absoluteUrl = (site: HasUrl, path: string) =>
  new URL(path, site.url).href;

export const logPath = (slug: string) => `/logs/${encodeURIComponent(slug)}`;

/**
 * The per-page tags for a route's `head`. The root route only supplies
 * fallbacks, because a canonical URL has to name the page it's on.
 */
export const pageHead = (
  site: HasUrl,
  page: {
    readonly path: string;
    readonly title: string;
    readonly description: string;
    /** Marks the page as an article published on this date. */
    readonly published?: string;
  },
) => {
  const url = absoluteUrl(site, page.path);
  return {
    meta: [
      { title: page.title },
      { name: "description", content: page.description },
      { property: "og:title", content: page.title },
      { property: "og:description", content: page.description },
      { property: "og:url", content: url },
      { property: "og:type", content: page.published ? "article" : "website" },
      ...(page.published
        ? [{ property: "article:published_time", content: page.published }]
        : []),
    ],
    links: [{ rel: "canonical", href: url }],
  };
};

/**
 * Every indexable page. Only logs get a `lastmod` tied to their date: the home
 * page also changes for reasons that have no date in the content.
 */
export const sitemapEntries = ({
  site,
  logs,
}: Pick<Content, "site" | "logs">) => [
  { loc: absoluteUrl(site, "/") },
  { loc: absoluteUrl(site, "/logs"), lastmod: logs[0]?.date },
  ...logs.map((log) => ({
    loc: absoluteUrl(site, logPath(log.slug)),
    lastmod: log.date,
  })),
];

export const sitemapXml = (content: Pick<Content, "site" | "logs">) =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...sitemapEntries(content).map(({ loc, lastmod }) =>
      lastmod
        ? `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod></url>`
        : `  <url><loc>${loc}</loc></url>`,
    ),
    "</urlset>",
    "",
  ].join("\n");

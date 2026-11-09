import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadContent } from "../content/parse.ts";
import { pageHead, sitemapEntries, sitemapXml } from "./seo.ts";

const content = loadContent(resolve("content"));
const { site, logs } = content;

describe("sitemap", () => {
  it("lists the home page, the log index and every published log", () => {
    expect(sitemapEntries(content).map((entry) => entry.loc)).toEqual([
      `${site.url}/`,
      `${site.url}/logs`,
      ...logs.map((log) => `${site.url}/logs/${log.slug}`),
    ]);
  });

  it("uses W3C dates for lastmod", () => {
    for (const { lastmod } of sitemapEntries(content)) {
      if (lastmod) expect(lastmod).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("leaves out a lastmod for pages with no date", () => {
    const xml = sitemapXml(content);
    expect(xml).toContain(`<url><loc>${site.url}/</loc></url>`);
    expect(xml.trimEnd().endsWith("</urlset>")).toBe(true);
  });

  it("copes with no logs", () => {
    expect(sitemapXml({ site, logs: [] })).toContain(`${site.url}/logs`);
  });
});

it("public/robots.txt points at the sitemap", () => {
  expect(readFileSync("public/robots.txt", "utf8")).toContain(
    `Sitemap: ${site.url}/sitemap.xml`,
  );
});

describe("pageHead", () => {
  const page = { path: "/logs/x", title: "T", description: "D" };

  it("declares the production URL as canonical", () => {
    expect(pageHead(site, page).links).toEqual([
      { rel: "canonical", href: `${site.url}/logs/x` },
    ]);
  });

  it("marks only dated pages as articles", () => {
    expect(pageHead(site, page).meta).toContainEqual({
      property: "og:type",
      content: "website",
    });
    expect(
      pageHead(site, { ...page, published: "2026-11-08" }).meta,
    ).toContainEqual({ property: "og:type", content: "article" });
  });
});

it("search snippets have no [placeholders] in them", () => {
  for (const text of Object.values(site.seo)) expect(text).not.toContain("[");
});

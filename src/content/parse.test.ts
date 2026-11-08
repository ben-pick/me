import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadContent, parseDocument } from "./parse.ts";

describe("parseDocument", () => {
  it("splits frontmatter from body and strips positions", () => {
    const { data, body } = parseDocument("---\nslug: a\n---\n\n- one\n");
    expect(data).toEqual({ slug: "a" });
    expect(body.children[0]?.type).toBe("list");
    expect(JSON.stringify(body)).not.toContain("position");
  });
});

describe("loadContent", () => {
  const content = loadContent(resolve("content"));

  it("loads every collection in order", () => {
    expect(content.companies.map((c) => c.slug)).toEqual([
      "kodo",
      "commbank-staff",
      "commbank-senior",
      "quantium",
      "school-bytes",
      "data61",
      "ibm",
    ]);
    expect(content.projects.map((p) => p.slug)).toEqual(["redacted"]);
    expect(content.interests.map((i) => i.slug)).toEqual([
      "bouldering",
      "djing",
      "gaming",
      "dogs",
      "tech",
      "streetwear",
      "pokemon",
    ]);
  });

  it("loads the page copy from site.json", () => {
    expect(content.site.name.first.length).toBeGreaterThan(0);
    expect(content.site.contact.email).toContain("@");
    expect(content.site.tags.length).toBeGreaterThan(0);
  });

  it("sorts logs newest first", () => {
    const dates = content.logs.map((p) => p.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it("links build logs to real projects", () => {
    const slugs = new Set(content.projects.map((p) => p.slug));
    for (const l of content.logs)
      if (l.project) expect(slugs.has(l.project)).toBe(true);
    expect(content.logs.some((l) => l.project === "redacted")).toBe(true);
  });

  it("never calls anything a side project", () => {
    expect(JSON.stringify(content).toLowerCase()).not.toContain("side project");
  });
});

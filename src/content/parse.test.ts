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
      "thanks",
      "commbank-staff",
      "commbank-senior",
      "quantium",
      "school-bytes",
      "data61",
      "ibm",
    ]);
    expect(content.projects).toHaveLength(3);
    expect(content.interests.map((i) => i.slug)).toEqual([
      "bouldering",
      "djing",
      "gaming",
      "dogs",
    ]);
  });

  it("sorts posts newest first", () => {
    const dates = content.posts.map((p) => p.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it("never calls anything a side project", () => {
    expect(JSON.stringify(content).toLowerCase()).not.toContain("side project");
  });
});

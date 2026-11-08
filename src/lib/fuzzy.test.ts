import { describe, expect, it } from "vitest";
import { fuzzyFilter, fuzzyMatch } from "./fuzzy.ts";

describe("fuzzyMatch", () => {
  it("matches subsequences and rejects others", () => {
    expect(fuzzyMatch("cmbk", "CommBank")).not.toBeNull();
    expect(fuzzyMatch("xyz", "CommBank")).toBeNull();
  });

  it("returns highlight indices in order", () => {
    expect(fuzzyMatch("nks", "Nooks")?.indices).toEqual([0, 3, 4]);
  });

  it("ranks word starts above scattered hits", () => {
    const ranked = fuzzyFilter(
      ["Open Gaming", "Open GitHub", "Copy email"],
      "gh",
      (s) => s,
    ).map((r) => r.item);
    expect(ranked[0]).toBe("Open GitHub");
  });

  it("keeps original order for an empty query", () => {
    const items = ["b", "a", "c"];
    expect(fuzzyFilter(items, "", (s) => s).map((r) => r.item)).toEqual(items);
  });
});

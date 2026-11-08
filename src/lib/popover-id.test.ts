import { describe, expect, it } from "vitest";
import { parsePopoverHash, popoverHash } from "./popover-id.ts";

describe("popover hashes", () => {
  it("round-trips", () => {
    const id = { kind: "interest", slug: "djing" } as const;
    expect(parsePopoverHash(popoverHash(id))).toEqual(id);
  });

  it("ignores section anchors", () => {
    expect(parsePopoverHash("#experience")).toBeNull();
    expect(parsePopoverHash("#company/")).toBeNull();
  });
});

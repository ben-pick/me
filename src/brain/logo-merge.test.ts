import { describe, expect, it } from "vitest";
import { phaseAt } from "./logo-merge.ts";

describe("phaseAt", () => {
  it("starts apart, ends as the word, and comes apart again", () => {
    expect(phaseAt(0)).toEqual({ gather: 0, merge: 0 });
    expect(phaseAt(1.4 + 6)).toEqual({ gather: 1, merge: 1 });
    expect(phaseAt(1.4 + 10.5)).toEqual({ gather: 0, merge: 0 });
  });

  it("loops without the intro", () => {
    expect(phaseAt(1.4 + 6 + 11)).toEqual(phaseAt(1.4 + 6));
  });
});

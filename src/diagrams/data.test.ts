import { describe, expect, it } from "vitest";
import { DIAGRAMS } from "./data.ts";
import { DIAGRAM_IDS } from "./ids.ts";
import { buildCloud, slotsFor, stopAt, TRAIL, targetLevels } from "./layout.ts";

const all = DIAGRAM_IDS.map((id) => [id, DIAGRAMS[id]] as const);

describe.each(all)("diagram %s", (_id, d) => {
  const ids = new Set(d.nodes.map((n) => n.id));

  it("has unique node ids and a real initial part", () => {
    expect(ids.size).toBe(d.nodes.length);
    expect(ids.has(d.initial)).toBe(true);
  });

  it("connects only real nodes", () => {
    for (const [a, b] of d.edges) {
      expect(ids.has(a), a).toBe(true);
      expect(ids.has(b), b).toBe(true);
    }
    for (const f of d.flows) {
      expect(f.steps.length).toBeGreaterThan(0);
      for (const s of f.steps) {
        expect(ids.has(s.from), s.from).toBe(true);
        expect(ids.has(s.to), s.to).toBe(true);
      }
    }
  });

  it("draws every open step along an edge", () => {
    const open = new Set(
      d.edges.flatMap(([a, b]) => [`${a}>${b}`, `${b}>${a}`]),
    );
    for (const f of d.flows)
      for (const s of f.steps)
        if (!s.blocked)
          expect(open, `${s.from}>${s.to}`).toContain(`${s.from}>${s.to}`);
  });

  it("tags every dot with a slot the shader has", () => {
    const cloud = buildCloud(d);
    const slots = slotsFor(d);
    expect(cloud.owners.length * 3).toBe(cloud.positions.length);
    expect(Math.max(...cloud.owners)).toBeLessThan(slots.count);
    expect(slots.count).toBe(d.nodes.length + d.edges.length + 2 + TRAIL);
  });

  it("returns one level per node, edge and wall", () => {
    const levels = targetLevels(d, {
      selected: d.initial,
      hovered: null,
      step: null,
      visited: [],
    });
    expect(levels).toHaveLength(d.nodes.length + d.edges.length + 1);
    expect(levels[d.nodes.findIndex((n) => n.id === d.initial)]).toBe(1);
  });
});

describe("stopAt", () => {
  const d = DIAGRAMS.architecture;

  it("lets open requests arrive", () => {
    expect(stopAt(d, { from: "builder", to: "app", note: "" })).toBe(1);
  });

  it("stops a blocked request at the wall it crosses", () => {
    const t = stopAt(d, { from: "isolate", to: "db", note: "", blocked: true });
    const from = d.nodes.find((n) => n.id === "isolate")?.at[0] ?? 0;
    const to = d.nodes.find((n) => n.id === "db")?.at[0] ?? 0;
    expect(from + (to - from) * t).toBeCloseTo(d.boundary.x);
  });
});

describe("the public copy", () => {
  it("keeps the product name out and avoids dashes", () => {
    const text = JSON.stringify(DIAGRAMS);
    expect(text.toLowerCase()).not.toContain("nooks");
    expect(text).not.toMatch(/[—–]/);
  });
});

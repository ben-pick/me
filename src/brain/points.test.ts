import { describe, expect, it } from "vitest";
import { buildBrain, facing, project, REGIONS } from "./points.ts";

describe("brain points", () => {
  const brain = buildBrain(0.25);

  it("labels every region and adds a second DJing anchor", () => {
    for (const r of REGIONS)
      expect(brain.anchors.some((a) => a.region === r)).toBe(true);
    for (const region of ["djing", "tech"]) {
      const pair = brain.anchors.filter((a) => a.region === region);
      expect(pair).toHaveLength(2);
      // One per hemisphere, mirrored left/right.
      expect(pair[0]?.at.x).toBeGreaterThan(0.4);
      expect(pair[1]?.at.x).toBeLessThan(-0.4);
    }
  });

  it("tucks the cerebellum under the cerebrum, behind the brainstem", () => {
    const at = (region: number) => {
      const out = { y: 0, z: 0, n: 0 };
      brain.regions.forEach((r, i) => {
        if (r !== region) return;
        out.y += brain.positions[i * 3 + 1] ?? 0;
        out.z += brain.positions[i * 3 + 2] ?? 0;
        out.n++;
      });
      return { y: out.y / out.n, z: out.z / out.n };
    };
    const cerebellum = at(REGIONS.indexOf("bouldering"));
    const stem = at(-1);
    expect(cerebellum.z).toBeLessThan(stem.z);
    expect(cerebellum.y).toBeLessThan(-0.4);
  });

  it("turns an anchor to face the camera", () => {
    for (const a of brain.anchors) {
      const { yaw, pitch } = facing(a.at, 0);
      const [x, , z] = project(a.at, yaw, 0, 0, 0, 1);
      expect(Math.abs(x)).toBeLessThan(1e-6);
      expect(z).toBeGreaterThan(0);
      expect(Math.abs(pitch)).toBeLessThanOrEqual(1.2);
    }
  });

  it("picks the yaw closest to the current one", () => {
    const { yaw } = facing({ x: 0, y: 0, z: 1 }, Math.PI * 4);
    expect(Math.abs(yaw - Math.PI * 4)).toBeLessThan(1e-9);
  });
});

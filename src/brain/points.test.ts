import { describe, expect, it } from "vitest";
import { buildBrain, facing, project, REGIONS } from "./points.ts";

describe("brain points", () => {
  const brain = buildBrain(0.25);

  it("labels every region and adds a second DJing anchor", () => {
    for (const r of REGIONS)
      expect(brain.anchors.some((a) => a.region === r)).toBe(true);
    const dj = brain.anchors.filter((a) => a.region === "djing");
    expect(dj).toHaveLength(2);
    // One per temporal lobe, mirrored left/right.
    expect(dj[0]?.at.x).toBeGreaterThan(0.5);
    expect(dj[1]?.at.x).toBeLessThan(-0.5);
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

/**
 * Turns a vector scene into the brain's square-dot halftone: the scene is
 * drawn white-on-black into an offscreen canvas at 2×, then sampled on a grid;
 * each cell becomes one dot whose size follows its brightness.
 */
export type SceneFn = (c: CanvasRenderingContext2D, t: number) => void;

/** [x, y, brightness] — x/y in CSS px from the scene centre. */
export type Cell = [number, number, number];

const SAMPLES: ReadonlyArray<[number, number]> = [
  [0, 0],
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

export interface Halftone {
  readonly pitch: number;
  render(scene: SceneFn, t: number): Cell[];
}

export const createHalftone = (
  w: number,
  h: number,
  pitch = 2.5,
  ss = 2,
): Halftone | null => {
  const canvas = document.createElement("canvas");
  const sw = Math.round(w * ss);
  const sh = Math.round(h * ss);
  canvas.width = sw;
  canvas.height = sh;
  const c = canvas.getContext("2d", { willReadFrequently: true });
  if (!c) return null;
  const gw = Math.floor(w / pitch);
  const gh = Math.floor(h / pitch);
  const cell = pitch * ss;
  return {
    pitch,
    render(scene, t) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.fillStyle = "#000";
      c.fillRect(0, 0, sw, sh);
      c.setTransform(ss, 0, 0, ss, sw / 2, sh / 2);
      scene(c, t);
      const px = c.getImageData(0, 0, sw, sh).data;
      const out: Cell[] = [];
      for (let gy = 0; gy < gh; gy++) {
        for (let gx = 0; gx < gw; gx++) {
          const sx = Math.floor(gx * cell + cell / 2);
          const sy = Math.floor(gy * cell + cell / 2);
          let lum = 0;
          for (const [ox, oy] of SAMPLES)
            lum += px[((sy + oy) * sw + (sx + ox)) * 4] ?? 0;
          lum /= SAMPLES.length * 255;
          if (lum < 0.06) continue;
          out.push([
            gx * pitch + pitch / 2 - w / 2,
            gy * pitch + pitch / 2 - h / 2,
            lum,
          ]);
        }
      }
      return out;
    },
  };
};

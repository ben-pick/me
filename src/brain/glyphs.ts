import type { Region } from "./points.ts";

/**
 * Dot-matrix vignettes for each brain region, drawn in the same square-dot
 * style as the point cloud. Each glyph returns dots in CSS pixels around (0,0)
 * for time `t` (seconds): [x, y, brightness 0–1].
 */
export type Dot = [number, number, number];

const TAU = Math.PI * 2;

const ring = (
  out: Dot[],
  cx: number,
  cy: number,
  r: number,
  n: number,
  a: number,
  rot = 0,
) => {
  for (let i = 0; i < n; i++) {
    const t = rot + (i / n) * TAU;
    out.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r, a]);
  }
};

const line = (
  out: Dot[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  n: number,
  a: number,
) => {
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    out.push([x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, a]);
  }
};

/** Filled ellipse as concentric rings, which reads rounder than a grid. */
const blob = (
  out: Dot[],
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  step: number,
  a: number,
) => {
  out.push([cx, cy, a]);
  for (let k = step; k <= Math.max(rx, ry); k += step) {
    const sx = (k / Math.max(rx, ry)) * rx;
    const sy = (k / Math.max(rx, ry)) * ry;
    const n = Math.max(6, Math.round((Math.PI * (sx + sy)) / step));
    for (let i = 0; i < n; i++) {
      const t = (i / n) * TAU + k;
      out.push([cx + Math.cos(t) * sx, cy + Math.sin(t) * sy, a]);
    }
  }
};

const cluster = (out: Dot[], cx: number, cy: number, a: number) => {
  out.push(
    [cx - 1, cy - 1, a],
    [cx + 1, cy - 1, a],
    [cx - 1, cy + 1, a],
    [cx + 1, cy + 1, a],
  );
};

/** Two platters spinning at 33⅓, a sliding crossfader and bouncing VU bars. */
const djing = (t: number): Dot[] => {
  const d: Dot[] = [];
  // Mixer body
  line(d, -50, -20, 50, -20, 25, 0.3);
  line(d, -50, 26, 50, 26, 25, 0.3);
  line(d, -50, -20, -50, 26, 11, 0.3);
  line(d, 50, -20, 50, 26, 11, 0.3);
  for (const [cx, dir] of [
    [-25, 1],
    [25, -1],
  ] as const) {
    const spin = t * 3.5 * dir;
    ring(d, cx, 2, 17, 30, 0.75, spin);
    ring(d, cx, 2, 9, 16, 0.4, -spin * 0.5);
    d.push([cx, 2, 1]);
    // Record marker
    line(
      d,
      cx + Math.cos(spin) * 4,
      2 + Math.sin(spin) * 4,
      cx + Math.cos(spin) * 15,
      2 + Math.sin(spin) * 15,
      4,
      1,
    );
  }
  // Crossfader
  line(d, -10, 21, 10, 21, 8, 0.35);
  const knob = Math.sin(t * 1.6) * 8;
  cluster(d, knob, 21, 1);
  // VU meter above the decks
  for (let i = 0; i < 9; i++) {
    const h = Math.round(
      1 + Math.abs(Math.sin(t * 7 + i * 1.7) * Math.cos(t * 2.3 + i)) * 4,
    );
    for (let j = 0; j < h; j++)
      d.push([-16 + i * 4, -26 - j * 3, j === h - 1 ? 1 : 0.6]);
  }
  return d;
};

const HOLDS: ReadonlyArray<[number, number]> = [
  [-8, 32],
  [10, 20],
  [-6, 8],
  [12, -4],
  [-2, -16],
  [16, -26],
  [4, -34],
];
const SPARE_HOLDS: ReadonlyArray<[number, number]> = [
  [-22, 26],
  [24, 30],
  [-24, -2],
  [28, 6],
  [-14, -30],
  [30, -18],
];

/** A climber moving hold to hold up an overhanging wall, then topping out. */
const bouldering = (t: number): Dot[] => {
  const d: Dot[] = [];
  // Overhanging wall
  line(d, -34, 40, -26, -40, 16, 0.45);
  line(d, 34, 40, 42, -40, 16, 0.45);
  line(d, -26, -40, 42, -40, 17, 0.45);
  for (const [x, y] of SPARE_HOLDS) cluster(d, x, y, 0.35);

  const moves = HOLDS.length - 1;
  const cycle = (t * 0.9) % (moves + 1.2);
  const step = Math.min(moves - 1, Math.floor(cycle));
  const raw = Math.min(1, cycle - step);
  const ease = raw < 0.5 ? 2 * raw * raw : 1 - (-2 * raw + 2) ** 2 / 2;
  const from = HOLDS[step] ?? [0, 0];
  const to = HOLDS[step + 1] ?? from;

  HOLDS.forEach(([x, y], i) => {
    cluster(d, x, y, i === step + 1 ? 1 : i <= step ? 0.75 : 0.45);
  });

  // Body hangs below the reaching hand.
  const hx = from[0] + (to[0] - from[0]) * ease;
  const hy = from[1] + (to[1] - from[1]) * ease;
  const sx = hx - 2;
  const sy = hy + 9;
  ring(d, sx - 2, sy - 5, 2.5, 8, 0.95);
  line(d, sx, sy - 2, sx + 1, sy + 10, 4, 0.95);
  line(d, sx, sy, to[0], to[1], 4, 1);
  line(d, sx, sy, from[0], from[1], 3, 0.8);
  const kick = Math.sin(t * 6) * 2;
  line(d, sx + 1, sy + 10, sx - 5, sy + 17 + kick, 3, 0.8);
  line(d, sx + 1, sy + 10, sx + 6, sy + 16 - kick, 3, 0.8);
  // Chalk puff on each catch
  if (raw > 0.85)
    ring(d, to[0], to[1], 3 + (raw - 0.85) * 40, 8, 0.6 * (1 - raw) * 6);
  return d;
};

/** A pad with a d-pad, face buttons firing in a combo and circling sticks. */
const gaming = (t: number): Dot[] => {
  const d: Dot[] = [];
  // Superellipse body with grips
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * TAU;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const grip = s > 0 ? 1 + 0.35 * Math.abs(c) ** 4 : 1;
    d.push([
      Math.sign(c) * Math.abs(c) ** 0.55 * 44,
      Math.sign(s) * Math.abs(s) ** 0.75 * 20 * grip,
      0.5,
    ]);
  }
  // D-pad
  for (let i = -2; i <= 2; i++) {
    d.push([-24 + i * 2.5, -3, 0.8], [-24, -3 + i * 2.5, 0.8]);
  }
  // Face buttons in a combo
  const combo = [0, 2, 1, 3, 0, 0];
  const beat = Math.floor(t * 5);
  const pressed = combo[beat % combo.length] ?? 0;
  const btns: ReadonlyArray<[number, number]> = [
    [24, -9],
    [30, -3],
    [24, 3],
    [18, -3],
  ];
  btns.forEach(([x, y], i) => {
    const on = i === pressed;
    cluster(d, x, y, on ? 1 : 0.45);
    if (on)
      ring(d, x, y, 3 + (t * 5 - beat) * 5, 8, 0.8 * (1 - (t * 5 - beat)));
  });
  // Thumbsticks
  for (const [cx, ph] of [
    [-9, 0],
    [9, 1.7],
  ] as const) {
    ring(d, cx, 9, 4.5, 10, 0.5);
    d.push([cx + Math.cos(t * 3 + ph) * 2, 9 + Math.sin(t * 3 + ph) * 2, 1]);
  }
  // Score ticker
  for (let i = 0; i < 6; i++)
    d.push([-10 + i * 4, -15, (beat + i) % 3 === 0 ? 1 : 0.35]);
  return d;
};

const heart = (out: Dot[], cx: number, cy: number, s: number, a: number) => {
  for (let i = 0; i < 14; i++) {
    const u = (i / 14) * TAU;
    const x = 16 * Math.sin(u) ** 3;
    const y = -(
      13 * Math.cos(u) -
      5 * Math.cos(2 * u) -
      2 * Math.cos(3 * u) -
      Math.cos(4 * u)
    );
    out.push([cx + x * s, cy + y * s, a]);
  }
};

/** A sitting dog: wagging tail, bobbing head, floppy ear, rising hearts. */
const dogs = (t: number): Dot[] => {
  const d: Dot[] = [];
  const bob = Math.sin(t * 3) * 1.2;
  blob(d, 6, 10, 17, 13, 3.2, 0.55); // body
  blob(d, 16, 22, 8, 6, 3.2, 0.55); // haunch
  line(d, -6, 20, -6, 32, 4, 0.7); // front legs
  line(d, 0, 21, 0, 32, 4, 0.7);
  line(d, -9, 32, -3, 32, 2, 0.7);
  blob(d, -14, -8 + bob, 9, 8, 3, 0.7); // head
  blob(d, -24, -5 + bob, 5, 3.4, 2.6, 0.7); // snout
  d.push([-29, -6 + bob, 1]); // nose
  d.push([-16, -10 + bob, 1]); // eye
  const flop = Math.sin(t * 3 + 0.6) * 2;
  line(d, -10, -15 + bob, -6 + flop, -2 + bob, 5, 0.9); // ear
  // Tail wag
  const wag = -1.0 + Math.sin(t * 14) * 0.55;
  const bx = 22;
  const by = 4;
  for (let i = 1; i <= 7; i++) {
    const r = i * 2.2;
    const curl = wag - i * 0.06;
    d.push([
      bx + Math.cos(curl) * r,
      by + Math.sin(curl) * r,
      0.75 + i * 0.035,
    ]);
  }
  // Hearts drift up from the head
  for (let k = 0; k < 2; k++) {
    const life = (t * 0.6 + k * 0.5) % 1;
    heart(
      d,
      -2 + k * 10 + Math.sin(life * 6) * 2,
      -20 - life * 18,
      0.22,
      1 - life,
    );
  }
  return d;
};

export const GLYPHS: Record<Region, (t: number) => Dot[]> = {
  bouldering,
  djing,
  gaming,
  dogs,
};

/** Callout size in CSS px. */
export const GLYPH_W = 124;
export const GLYPH_H = 92;

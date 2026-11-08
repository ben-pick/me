import { GLYPH_H, GLYPH_W, GLYPHS } from "./glyphs.ts";

/**
 * Procedural brain point cloud, ported from the approved prototype. Regions are
 * indexed by `REGIONS`; -1 is unlabelled tissue. Swap `buildBrain` for samples
 * from a real anatomical mesh when one is licensed — the rest of the scene only
 * relies on `positions`, `regions` and `anchors`.
 */
export const REGIONS = ["bouldering", "djing", "gaming", "dogs"] as const;
export type Region = (typeof REGIONS)[number];

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Brain {
  readonly positions: Float32Array;
  readonly regions: Float32Array;
  readonly seeds: Float32Array;
  /** Label anchors pushed slightly outside the surface; DJing has one per hemisphere. */
  readonly anchors: ReadonlyArray<{ region: Region; at: Vec3 }>;
}

const fib = (n: number, fn: (x: number, y: number, z: number) => void) => {
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n;
    const r = Math.sqrt(1 - y * y);
    const ph = i * 2.399963;
    fn(Math.cos(ph) * r, y, Math.sin(ph) * r);
  }
};

const gyri = (dx: number, dy: number, dz: number) =>
  0.05 * Math.sin(dx * 9 + dz * 5) * Math.sin(dy * 11 - dz * 3) +
  0.035 * Math.sin(dz * 17 + dy * 7) * Math.cos(dx * 13);

export const buildBrain = (scale = 1): Brain => {
  const pts: Array<Vec3 & { r: number }> = [];
  const idx = (r: Region | null) => (r === null ? -1 : REGIONS.indexOf(r));

  const cerebrum = (n: number, shell: number) =>
    fib(n, (dx, dy, dz) => {
      const yy = dy < 0 ? dy * 0.62 : dy * 0.82;
      let rr = (1 + gyri(dx, dy, dz)) * shell;
      const ax = Math.abs(dx);
      if (ax < 0.08) rr -= 0.14 * (1 - ax / 0.08);
      let reg: Region | null = null;
      if (dz > 0.38) reg = "dogs";
      else if (dz < -0.5 && dy > -0.45) reg = "gaming";
      else if (dy < 0.05 && ax > 0.5) reg = "djing";
      pts.push({
        x: dx * 0.82 * rr + (dx < 0 ? -0.05 : 0.05),
        y: yy * rr + 0.12,
        z: dz * 1.05 * rr,
        r: idx(reg),
      });
    });

  cerebrum(Math.round(4200 * scale), 1);
  cerebrum(Math.round(1200 * scale), 0.86);
  fib(Math.round(1200 * scale), (dx, dy, dz) => {
    const rr = 1 + 0.07 * Math.sin(dy * 34);
    pts.push({
      x: dx * 0.52 * rr,
      y: dy * 0.26 * rr - 0.48,
      z: dz * 0.32 * rr - 0.7,
      r: 0,
    });
  });
  const stem = Math.round(260 * scale);
  for (let i = 0; i < stem; i++) {
    const t = i / stem;
    const a = i * 2.399963;
    pts.push({
      x: Math.cos(a) * 0.12,
      y: -0.42 - t * 0.6,
      z: Math.sin(a) * 0.12 - 0.32,
      r: -1,
    });
  }

  const positions = new Float32Array(pts.length * 3);
  const regions = new Float32Array(pts.length);
  const seeds = new Float32Array(pts.length);
  const acc = REGIONS.map(() => ({ x: 0, y: 0, z: 0, n: 0 }));
  pts.forEach((p, i) => {
    positions.set([p.x, p.y, p.z], i * 3);
    regions[i] = p.r;
    seeds[i] = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const a = acc[p.r];
    if (a) {
      // DJing covers both temporal lobes: average one side, mirror later.
      a.x += p.r === REGIONS.indexOf("djing") ? Math.abs(p.x) : p.x;
      a.y += p.y;
      a.z += p.z;
      a.n++;
    }
  });

  const anchors: Array<{ region: Region; at: Vec3 }> = [];
  REGIONS.forEach((region, i) => {
    const c = acc[i];
    if (!c || c.n === 0) return;
    const x = c.x / c.n;
    const y = c.y / c.n;
    const z = c.z / c.n;
    const L = Math.hypot(x, y, z) || 1;
    const s = (L + 0.38) / L;
    anchors.push({ region, at: { x: x * s, y: y * s, z: z * s } });
    if (region === "djing")
      anchors.push({ region, at: { x: -x * s, y: y * s, z: z * s } });
  });

  return { positions, regions, seeds, anchors };
};

/** Same projection as the prototype: yaw about Y, then pitch about X, camera at z = 3.2. */
export const project = (
  p: Vec3,
  yaw: number,
  pitch: number,
  cx: number,
  cy: number,
  sc: number,
): [number, number, number] => {
  const cyw = Math.cos(yaw);
  const syw = Math.sin(yaw);
  const x1 = p.x * cyw + p.z * syw;
  const z1 = -p.x * syw + p.z * cyw;
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const y2 = p.y * cp - z1 * sp;
  const z2 = p.y * sp + z1 * cp;
  const f = (sc * 3.2) / (3.2 - z2);
  return [cx + x1 * f, cy - y2 * f, z2];
};

/** Yaw/pitch that turn an anchor to face the camera, picking the yaw nearest `from`. */
export const facing = (
  p: Vec3,
  from: number,
): { yaw: number; pitch: number } => {
  let yaw = Math.atan2(-p.x, p.z);
  while (yaw - from > Math.PI) yaw -= Math.PI * 2;
  while (yaw - from < -Math.PI) yaw += Math.PI * 2;
  const r = Math.hypot(p.x, p.z);
  const pitch = Math.max(-1.2, Math.min(1.2, Math.atan2(p.y, r) * 0.7));
  return { yaw, pitch };
};

export const NAMES: Record<Region, string> = {
  bouldering: "01 Bouldering",
  djing: "02 DJing",
  gaming: "03 Gaming",
  dogs: "04 Dogs",
};

export interface ScreenAnchor {
  region: Region;
  x: number;
  y: number;
}

/** Leader lines + labels on a 2D canvas (device pixels). */
interface LabelItem {
  region: Region;
  q: [number, number, number];
  ex: number;
  ey: number;
  right: boolean;
  tw: number;
  lv: number;
  vis: number;
}

const easeOut = (x: number) => 1 - (1 - x) ** 3;

/**
 * A bracketed callout holding the region's dot vignette. Every dot flies out of
 * the region's anchor, staggered, as the selection level `p` rises.
 */
const drawCallout = (
  ctx: CanvasRenderingContext2D,
  item: LabelItem,
  p: number,
  time: number,
  w: number,
  h: number,
  dpr: number,
) => {
  const bw = GLYPH_W * dpr;
  const bh = GLYPH_H * dpr;
  const pad = 10 * dpr;
  const gap = 20 * dpr;
  let bx = item.right
    ? item.ex + 24 * dpr + bw / 2
    : item.ex - 24 * dpr - bw / 2;
  bx = Math.min(Math.max(bx, bw / 2 + pad), w - bw / 2 - pad);
  // Sit above or below the label, whichever side has room for the whole box.
  const above = item.ey - gap - bh / 2;
  const below = item.ey + gap + bh / 2;
  const fitsAbove = above - bh / 2 >= pad + 18 * dpr;
  const fitsBelow = below + bh / 2 <= h - pad - 18 * dpr;
  let by =
    fitsAbove && (!fitsBelow || item.ey < h / 2)
      ? above
      : fitsBelow
        ? below
        : above;
  by = Math.min(Math.max(by, bh / 2 + pad), h - bh / 2 - pad);
  const e = easeOut(Math.min(1, p * 1.3));
  const [ax, ay] = item.q;
  const fx = ax + (bx - ax) * e;
  const fy = ay + (by - ay) * e;
  const fw = (bw / 2) * e;
  const fh = (bh / 2) * e;

  // Dark plate + corner brackets
  ctx.fillStyle = `rgba(18,18,18,${0.78 * e})`;
  ctx.fillRect(fx - fw, fy - fh, fw * 2, fh * 2);
  ctx.strokeStyle = `rgba(236,229,225,${0.85 * e})`;
  ctx.lineWidth = dpr;
  const k = 9 * dpr * e;
  ctx.beginPath();
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const) {
    const x = fx + sx * fw;
    const y = fy + sy * fh;
    ctx.moveTo(x - sx * k, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y - sy * k);
  }
  ctx.stroke();
  ctx.font = `${9 * dpr}px "JetBrains Mono", monospace`;
  ctx.textAlign = "left";
  ctx.fillStyle = `rgba(138,138,138,${e})`;
  ctx.fillText(
    `FIG. ${NAMES[item.region].slice(0, 2)}`,
    fx - fw + 7 * dpr,
    fy + fh - 8 * dpr,
  );

  const dots = GLYPHS[item.region](time);
  const n = dots.length;
  const size = 1.6 * dpr;
  dots.forEach(([x, y, a], i) => {
    const local = easeOut(Math.min(1, Math.max(0, p * 1.7 - (i / n) * 0.7)));
    if (local <= 0) return;
    const tx = bx + x * dpr;
    const ty = by + (y - 2) * dpr;
    const px = ax + (tx - ax) * local;
    const py = ay + (ty - ay) * local;
    ctx.fillStyle = `rgba(236,229,225,${(a * local).toFixed(3)})`;
    ctx.fillRect(px - size / 2, py - size / 2, size, size);
  });
};

/** Leader lines, labels and (for the selected region) its animated callout. */
export const drawLabels = (
  ctx: CanvasRenderingContext2D,
  anchors: Brain["anchors"],
  yaw: number,
  pitch: number,
  w: number,
  h: number,
  dpr: number,
  levels: Record<Region, number>,
  glyph?: { readonly time: number; readonly sel: Record<Region, number> },
): ScreenAnchor[] => {
  const cx = w / 2;
  const cy = h / 2;
  const sc = Math.min(w, h) * 0.33;
  ctx.clearRect(0, 0, w, h);
  ctx.font = `${11 * dpr}px "JetBrains Mono", monospace`;
  ctx.textBaseline = "middle";
  ctx.lineWidth = dpr;
  const out: ScreenAnchor[] = [];
  const items: LabelItem[] = [];
  for (const a of anchors) {
    const q = project(a.at, yaw, pitch, cx, cy, sc);
    if (q[2] < -0.12) continue;
    out.push({ region: a.region, x: q[0], y: q[1] });
    const lv = levels[a.region];
    let dx = q[0] - cx;
    let dy = q[1] - cy;
    // Anchors facing the camera sit near the centre: lead out to the upper right.
    if (Math.hypot(dx, dy) < 40 * dpr) {
      dx = 1;
      dy = -0.7;
    }
    const L = Math.hypot(dx, dy) || 1;
    const reach = 1 + lv * 0.25;
    const ex = q[0] + (dx / L) * 46 * dpr * reach;
    const ey = q[1] + (dy / L) * 30 * dpr * reach;
    const tw = ctx.measureText(NAMES[a.region].toUpperCase()).width;
    let right = dx >= 0;
    // Flip the label rather than let it clip at the panel edge.
    if (right && ex + 24 * dpr + tw > w - 10 * dpr) right = false;
    else if (!right && ex - 24 * dpr - tw < 10 * dpr) right = true;
    // Fade labels in as they rotate into view.
    const vis = Math.min(1, (q[2] + 0.12) / 0.3);
    items.push({ region: a.region, q, ex, ey, right, tw, lv, vis });
  }

  if (glyph) {
    // One callout per region, from its front-most anchor (DJing has two).
    const front = new Map<Region, LabelItem>();
    for (const it of items) {
      const cur = front.get(it.region);
      if (!cur || it.q[2] > cur.q[2]) front.set(it.region, it);
    }
    for (const it of front.values()) {
      const p = glyph.sel[it.region] * it.vis;
      if (p > 0.01) drawCallout(ctx, it, p, glyph.time, w, h, dpr);
    }
    ctx.font = `${11 * dpr}px "JetBrains Mono", monospace`;
    ctx.lineWidth = dpr;
  }

  for (const it of items) {
    const { lv, vis, q, ex, ey, right } = it;
    const g = Math.round(138 + (236 - 138) * lv);
    const b = Math.round(138 + (225 - 138) * lv);
    ctx.strokeStyle =
      ctx.fillStyle = `rgba(${g},${Math.round(138 + (229 - 138) * lv)},${b},${vis})`;
    ctx.beginPath();
    ctx.arc(q[0], q[1], (3 + lv) * dpr, 0, Math.PI * 2);
    if (lv > 0.5) ctx.fill();
    else ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(q[0], q[1]);
    ctx.lineTo(ex, ey);
    ctx.lineTo(ex + (right ? 18 : -18) * dpr, ey);
    ctx.stroke();
    ctx.textAlign = right ? "left" : "right";
    ctx.fillText(
      NAMES[it.region].toUpperCase(),
      ex + (right ? 24 : -24) * dpr,
      ey,
    );
  }
  return out;
};

/** A single still frame on a 2D canvas: the reduced-motion / no-WebGL fallback. */
export const drawStill = (
  dots: CanvasRenderingContext2D,
  brain: Brain,
  yaw: number,
  pitch: number,
  w: number,
  h: number,
  dpr: number,
  selected: Region,
) => {
  const cx = w / 2;
  const cy = h / 2;
  const sc = Math.min(w, h) * 0.33;
  dots.clearRect(0, 0, w, h);
  const sel = REGIONS.indexOf(selected);
  const n = brain.regions.length;
  for (let i = 0; i < n; i++) {
    const p = {
      x: brain.positions[i * 3] ?? 0,
      y: brain.positions[i * 3 + 1] ?? 0,
      z: brain.positions[i * 3 + 2] ?? 0,
    };
    const q = project(p, yaw, pitch, cx, cy, sc);
    const t = Math.max(0, Math.min(1, (q[2] + 1.3) / 2.6));
    const r = brain.regions[i] ?? -1;
    const on = r === sel;
    const a = on ? 0.35 + 0.65 * t : r >= 0 ? 0.12 + 0.5 * t : 0.08 + 0.4 * t;
    const s = (on ? 1.3 + 1.6 * t : 0.8 + 1.1 * t) * dpr;
    dots.fillStyle = on ? `rgba(236,229,225,${a})` : `rgba(150,148,146,${a})`;
    dots.fillRect(q[0] - s / 2, q[1] - s / 2, s, s);
  }
};

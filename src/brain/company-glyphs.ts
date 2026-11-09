/**
 * Company previews: small animated vector illustrations, drawn in white on
 * black into an offscreen canvas, then turned into the brain's square-dot
 * halftone by `CompanyScene`. Drawing real shapes and gradients (rather
 * than placing dots by hand) gives shading, depth and fine detail. No text.
 *
 * Each scene draws around (0,0) in CSS px, within roughly ±125 × ±80.
 */
export type SceneFn = (c: CanvasRenderingContext2D, t: number) => void;

const TAU = Math.PI * 2;
const ease = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

const gray = (v: number, a = 1) => `rgba(${v},${v},${v},${a})`;

const rr = (
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) => {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
};

/** Vertical light-to-dark gradient, for a lit-from-above look. */
const shade = (
  c: CanvasRenderingContext2D,
  y0: number,
  y1: number,
  top: number,
  bottom: number,
) => {
  const g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, gray(Math.round(top)));
  g.addColorStop(1, gray(Math.round(bottom)));
  return g;
};

const glow = (
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  v: number,
) => {
  if (r <= 0) return;
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, gray(v));
  g.addColorStop(1, gray(v, 0));
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.fill();
};

/* ------------------------------------------------------------------ Thanks */

const giftBox = (
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  t: number,
) => {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  const lift = Math.max(0, Math.sin(t * 2.2)) ** 4 * 5;
  c.fillStyle = shade(c, -4, 22, 210, 90);
  c.fillRect(-18, -2, 36, 24);
  c.fillStyle = shade(c, -10 - lift, -2 - lift, 250, 170);
  c.fillRect(-21, -10 - lift, 42, 9);
  c.fillStyle = gray(30);
  c.fillRect(-3, -10 - lift, 6, 32 + lift);
  c.strokeStyle = gray(255);
  c.lineWidth = 3.5;
  c.beginPath();
  c.ellipse(-7, -15 - lift, 7, 4.5, -0.5, 0, TAU);
  c.stroke();
  c.beginPath();
  c.ellipse(7, -15 - lift, 7, 4.5, 0.5, 0, TAU);
  c.stroke();
  c.restore();
};

const cup = (
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  t: number,
) => {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.fillStyle = shade(c, -10, 20, 235, 95);
  c.beginPath();
  c.moveTo(-15, -10);
  c.lineTo(15, -10);
  c.lineTo(11, 20);
  c.lineTo(-11, 20);
  c.closePath();
  c.fill();
  c.strokeStyle = gray(200);
  c.lineWidth = 4;
  c.beginPath();
  c.arc(16, 3, 6, -1.3, 1.3);
  c.stroke();
  c.fillStyle = gray(255);
  c.fillRect(-17, -13, 34, 4);
  c.strokeStyle = gray(200);
  c.lineWidth = 2.5;
  for (let k = 0; k < 3; k++) {
    const ph = (t * 0.9 + k / 3) % 1;
    c.globalAlpha = 1 - ph;
    c.beginPath();
    for (let i = 0; i <= 10; i++) {
      const yy = -16 - ph * 18 - i * 1.4;
      const xx = -7 + k * 7 + Math.sin(i * 0.8 + t * 4 + k) * 2.5;
      if (i === 0) c.moveTo(xx, yy);
      else c.lineTo(xx, yy);
    }
    c.stroke();
  }
  c.globalAlpha = 1;
  c.restore();
};

const ticket = (
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
) => {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.rotate(-0.12);
  c.fillStyle = shade(c, -14, 14, 240, 120);
  c.beginPath();
  c.roundRect(-24, -14, 48, 28, 3);
  c.fill();
  // Punched notches
  c.fillStyle = gray(Math.round(70 * s));
  c.beginPath();
  c.arc(-24, 0, 5, 0, TAU);
  c.arc(24, 0, 5, 0, TAU);
  c.fill();
  c.fillStyle = gray(25);
  for (let i = -12; i <= 12; i += 4) c.fillRect(8, i - 1, 2, 2);
  c.fillStyle = gray(60);
  c.beginPath();
  c.arc(-6, 0, 7, 0, TAU);
  c.fill();
  c.restore();
};

/** A phone running the offer carousel: cards glide, one is claimed, rewards fly out. */
const thanks: SceneFn = (c, t) => {
  c.fillStyle = gray(28);
  rr(c, -122, -78, 92, 158, 16);
  c.fill();
  c.lineWidth = 3;
  c.strokeStyle = shade(c, -78, 80, 235, 120);
  c.stroke();
  c.fillStyle = gray(150);
  rr(c, -90, -71, 28, 4, 2);
  c.fill();

  const slot = 1.8;
  const i = Math.floor(t / slot);
  const local = (t % slot) / slot;
  const slide = ease(clamp01((local - 0.72) / 0.28));
  c.save();
  c.beginPath();
  c.rect(-118, -60, 84, 100);
  c.clip();
  for (let k = -1; k <= 2; k++) {
    const idx = (((i + k) % 3) + 3) % 3;
    const cx = -76 + (k - slide) * 66;
    const depth = 1 - Math.min(1, Math.abs(cx + 76) / 66) * 0.25;
    c.fillStyle = gray(Math.round(70 * depth));
    rr(c, cx - 30, -48, 60, 74, 6);
    c.fill();
    c.strokeStyle = gray(Math.round(160 * depth));
    c.lineWidth = 1.5;
    c.stroke();
    if (idx === 0) giftBox(c, cx, -14, depth, t);
    else if (idx === 1) cup(c, cx, -14, depth, t);
    else ticket(c, cx, -12, depth);
    c.fillStyle = gray(Math.round(140 * depth));
    c.fillRect(cx - 18, 12, 36, 3);
    c.fillStyle = gray(Math.round(90 * depth));
    c.fillRect(cx - 12, 18, 24, 2);
  }
  c.restore();

  for (let k = 0; k < 3; k++) {
    c.fillStyle = gray(k === i % 3 ? 255 : 90);
    c.beginPath();
    c.arc(-84 + k * 8, 34, k === i % 3 ? 2.6 : 1.8, 0, TAU);
    c.fill();
  }
  const press =
    clamp01((local - 0.35) / 0.12) * (1 - clamp01((local - 0.5) / 0.15));
  c.fillStyle = shade(c, 44, 60, 255 - press * 40, 180 - press * 40);
  rr(c, -108, 44 + press * 2, 64, 15, 7);
  c.fill();
  if (local > 0.42 && local < 0.85) {
    const p = (local - 0.42) / 0.43;
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * TAU;
      const r = 10 + p * 46;
      c.fillStyle = gray(255, 1 - p);
      c.beginPath();
      c.arc(
        -76 + Math.cos(a) * r,
        51 + Math.sin(a) * r * 0.7,
        2.4 * (1 - p) + 0.6,
        0,
        TAU,
      );
      c.fill();
    }
  }

  // Rewards arc out of the phone onto a growing stack
  for (let k = 0; k < 4; k++) {
    const ph = (t * 0.55 + k / 4) % 1;
    const x = -24 + ph * 116;
    const y = -10 - Math.sin(ph * Math.PI) * 44;
    c.save();
    c.translate(x, y);
    c.rotate(ph * 0.8 - 0.4);
    c.globalAlpha = Math.sin(ph * Math.PI);
    giftBox(c, 0, 0, 0.6, t + k);
    c.restore();
  }
  c.globalAlpha = 1;
  const n = 6 + (Math.floor(t * 1.1) % 6);
  for (let k = 0; k < n; k++) {
    c.fillStyle = shade(c, 70 - k * 7, 76 - k * 7, 240 - k * 8, 120);
    rr(c, 70, 68 - k * 7, 48, 6, 2);
    c.fill();
  }
};

/* ---------------------------------------------------------- CommBank (auth) */

const bank = (
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  lit: number,
) => {
  c.save();
  c.translate(x, y);
  c.fillStyle = gray(Math.round(150 + lit * 105));
  c.beginPath();
  c.moveTo(-16, -6);
  c.lineTo(0, -16);
  c.lineTo(16, -6);
  c.closePath();
  c.fill();
  for (let k = -2; k <= 2; k++) c.fillRect(k * 6 - 1.5, -4, 3, 13);
  c.fillRect(-17, 10, 34, 3);
  c.restore();
};

/** One auth core for four brands: requests fly in, get verified, return lit. */
const commbankStaff: SceneFn = (c, t) => {
  const nodes = [
    [-92, -48],
    [92, -48],
    [-92, 48],
    [92, 48],
  ] as const;
  for (let k = 0; k < 3; k++) {
    const p = (t * 0.6 + k / 3) % 1;
    c.strokeStyle = gray(255, 0.6 * (1 - p));
    c.lineWidth = 2;
    c.beginPath();
    c.arc(0, 0, 30 + p * 44, 0, TAU);
    c.stroke();
  }
  nodes.forEach(([x, y], k) => {
    c.strokeStyle = gray(80);
    c.setLineDash([3, 4]);
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(x * 0.72, y * 0.72);
    c.lineTo(x * 0.3, y * 0.3);
    c.stroke();
    c.setLineDash([]);
    const ph = (t * 0.55 + k * 0.25) % 1;
    const go = ph < 0.5 ? ph * 2 : 2 - ph * 2;
    const s = ease(go);
    const px = x * 0.72 + (x * 0.3 - x * 0.72) * s;
    const py = y * 0.72 + (y * 0.3 - y * 0.72) * s;
    glow(c, px, py, 9, 255);
    c.fillStyle = gray(255);
    c.beginPath();
    c.arc(px, py, 3, 0, TAU);
    c.fill();
    const ok =
      ph > 0.5 ? clamp01((ph - 0.5) * 4) * (1 - clamp01((ph - 0.9) * 10)) : 0;
    c.fillStyle = gray(Math.round(35 + ok * 40));
    rr(c, x - 28, y - 22, 56, 44, 6);
    c.fill();
    c.strokeStyle = gray(Math.round(120 + ok * 135));
    c.lineWidth = 1.5;
    c.stroke();
    bank(c, x, y + 2, ok);
  });
  // Padlock
  const open = Math.max(0, Math.sin(t * 1.3)) ** 8;
  c.strokeStyle = shade(c, -34, -8, 255, 170);
  c.lineWidth = 6;
  c.beginPath();
  c.arc(0, -10 - open * 8, 13, Math.PI, TAU);
  c.lineTo(13, -4);
  c.moveTo(-13, -10 - open * 8);
  c.lineTo(-13, -4 - open * 8);
  c.stroke();
  c.fillStyle = shade(c, -6, 26, 250, 110);
  rr(c, -22, -6, 44, 34, 6);
  c.fill();
  c.fillStyle = gray(255, 0.7);
  c.fillRect(-18, -3, 36, 2);
  c.fillStyle = gray(20);
  c.beginPath();
  c.arc(0, 7, 4.5, 0, TAU);
  c.fill();
  c.fillRect(-2, 8, 4, 10);
};

/* --------------------------------------------------------- CommBank (Murex) */

/** Candles, a lit moving-average line over an area fill, and volume. */
const commbankSenior: SceneFn = (c, t) => {
  const left = -122;
  const right = 122;
  const step = 11;
  const scroll = t * 12;
  const offset = scroll % step;
  const base = Math.floor(scroll / step);
  const price = (k: number) =>
    Math.sin(k * 0.41) * 22 +
    Math.sin(k * 0.16) * 16 +
    Math.sin(k * 1.3) * 5 -
    14;
  c.strokeStyle = gray(45);
  c.lineWidth = 1;
  for (let y = -70; y <= 30; y += 25) {
    c.beginPath();
    c.moveTo(left, y);
    c.lineTo(right, y);
    c.stroke();
  }
  const pts: Array<[number, number]> = [];
  for (let i = -1; i < 25; i++) {
    const k = base + i;
    let ma = 0;
    for (let j = 0; j < 6; j++) ma += price(k - j);
    pts.push([left + i * step - offset, ma / 6]);
  }
  const area = c.createLinearGradient(0, -60, 0, 40);
  area.addColorStop(0, gray(150));
  area.addColorStop(1, gray(0));
  c.fillStyle = area;
  c.beginPath();
  c.moveTo(pts[0]?.[0] ?? left, 40);
  for (const [x, y] of pts) c.lineTo(x, y);
  c.lineTo(pts.at(-1)?.[0] ?? right, 40);
  c.closePath();
  c.fill();
  for (let i = 0; i < 25; i++) {
    const k = base + i;
    const x = left + i * step - offset;
    const o = price(k - 0.6);
    const cl = price(k);
    const up = cl < o;
    const hi = Math.min(o, cl) - 4 - Math.abs(Math.sin(k * 2.1)) * 8;
    const lo = Math.max(o, cl) + 4 + Math.abs(Math.cos(k * 1.7)) * 8;
    c.strokeStyle = gray(up ? 230 : 130);
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(x, hi);
    c.lineTo(x, lo);
    c.stroke();
    const top = Math.min(o, cl);
    const h = Math.max(2, Math.abs(cl - o));
    if (up) {
      c.fillStyle = shade(c, top, top + h, 255, 190);
      c.fillRect(x - 3.5, top, 7, h);
    } else {
      c.fillStyle = gray(25);
      c.fillRect(x - 3.5, top, 7, h);
      c.strokeStyle = gray(150);
      c.strokeRect(x - 3.5, top, 7, h);
    }
    const v = 6 + Math.abs(Math.sin(k * 0.9)) * 22;
    c.fillStyle = gray(up ? 150 : 70);
    c.fillRect(x - 3.5, 78 - v, 7, v);
  }
  c.strokeStyle = gray(255);
  c.lineWidth = 2.5;
  c.beginPath();
  pts.forEach(([x, y], i) => {
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  });
  c.stroke();
  const lastY = pts.at(-3)?.[1] ?? 0;
  const pulse = (t * 1.5) % 1;
  glow(c, right - 22, lastY, 10 + pulse * 10, 255);
  c.fillStyle = gray(255);
  c.beginPath();
  c.arc(right - 22, lastY, 3.5, 0, TAU);
  c.fill();
};

/* ---------------------------------------------------------------- Quantium */

const CLUSTERS = [
  [-60, 22, 34, 160],
  [8, -12, 28, 200],
  [70, -40, 20, 255],
] as const;

const cloud = (
  c: CanvasRenderingContext2D,
  zoom: number,
  cx: number,
  cy: number,
) => {
  for (let i = 0; i < 420; i++) {
    const cl = CLUSTERS[i % 3] ?? CLUSTERS[0];
    const r = Math.abs(Math.sin(i * 12.989)) ** 0.7 * cl[2];
    const a = i * 2.3999;
    const x = cl[0] + Math.cos(a) * r;
    const y = cl[1] + Math.sin(a) * r * 0.72;
    c.fillStyle = gray(Math.round(cl[3] * (1 - r / cl[2]) * 0.8 + 50));
    c.beginPath();
    c.arc(cx + (x - cx) * zoom, cy + (y - cy) * zoom, 1.6 * zoom, 0, TAU);
    c.fill();
  }
};

/** Brands as a scatter; a lens sweeps across and magnifies what it finds. */
const quantium: SceneFn = (c, t) => {
  c.strokeStyle = gray(90);
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(-122, -78);
  c.lineTo(-122, 70);
  c.lineTo(122, 70);
  c.stroke();
  CLUSTERS.forEach(([x, y, r], k) => {
    glow(c, x, y, r * 1.3, 70 + k * 30);
  });
  cloud(c, 1, 0, 0);
  const lx = Math.sin(t * 0.55) * 72;
  const ly = Math.sin(t * 1.1) * 26 - 6;
  const R = 30;
  c.save();
  c.beginPath();
  c.arc(lx, ly, R, 0, TAU);
  c.clip();
  c.fillStyle = gray(10);
  c.fillRect(lx - R, ly - R, R * 2, R * 2);
  cloud(c, 2, lx, ly);
  const sheen = c.createLinearGradient(lx - R, ly - R, lx + R, ly + R);
  sheen.addColorStop(0, gray(255, 0.35));
  sheen.addColorStop(0.4, gray(255, 0));
  c.fillStyle = sheen;
  c.fillRect(lx - R, ly - R, R * 2, R * 2);
  c.restore();
  c.strokeStyle = shade(c, ly - R, ly + R, 255, 150);
  c.lineWidth = 5;
  c.beginPath();
  c.arc(lx, ly, R, 0, TAU);
  c.stroke();
  c.lineCap = "round";
  c.lineWidth = 8;
  c.strokeStyle = gray(200);
  c.beginPath();
  c.moveTo(lx + R * 0.72, ly + R * 0.72);
  c.lineTo(lx + R * 1.45, ly + R * 1.45);
  c.stroke();
  c.lineCap = "butt";
};

/* ------------------------------------------------------------- School Bytes */

/** A schoolhouse with a waving flag; a class lights up as the roll is called. */
const schoolBytes: SceneFn = (c, t) => {
  const bx = -70;
  c.fillStyle = shade(c, -40, 70, 210, 70);
  c.fillRect(bx - 48, -20, 96, 88);
  c.fillStyle = shade(c, -60, -20, 255, 170);
  c.beginPath();
  c.moveTo(bx - 56, -18);
  c.lineTo(bx, -52);
  c.lineTo(bx + 56, -18);
  c.closePath();
  c.fill();
  c.fillStyle = gray(30);
  c.beginPath();
  c.arc(bx, -30, 9, 0, TAU);
  c.fill();
  c.strokeStyle = gray(255);
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(bx, -30);
  c.lineTo(
    bx + Math.cos(t * 0.6 - Math.PI / 2) * 6,
    -30 + Math.sin(t * 0.6 - Math.PI / 2) * 6,
  );
  c.moveTo(bx, -30);
  c.lineTo(
    bx + Math.cos(t * 4 - Math.PI / 2) * 7.5,
    -30 + Math.sin(t * 4 - Math.PI / 2) * 7.5,
  );
  c.stroke();
  for (let k = -2; k <= 2; k++) {
    c.fillStyle = shade(c, -14, 66, 255, 150);
    c.fillRect(bx + k * 19 - 3, -14, 6, 80);
  }
  c.fillStyle = gray(20);
  rr(c, bx - 8, 40, 16, 28, 8);
  c.fill();
  c.fillStyle = gray(200);
  c.fillRect(bx - 1, -82, 2, 32);
  c.fillStyle = gray(255);
  c.beginPath();
  c.moveTo(bx + 1, -82);
  for (let i = 0; i <= 12; i++)
    c.lineTo(
      bx + 1 + i * 2.2,
      -82 + Math.sin(i * 0.6 - t * 6) * 2.2 * (i / 12),
    );
  for (let i = 12; i >= 0; i--)
    c.lineTo(
      bx + 1 + i * 2.2,
      -70 + Math.sin(i * 0.6 - t * 6) * 2.2 * (i / 12),
    );
  c.closePath();
  c.fill();
  const cols = 5;
  const rows = 4;
  const sweep = (t * 7) % (cols * rows + 8);
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const i = r * cols + col;
      const x = 18 + col * 24;
      const y = -46 + r * 34;
      const on = clamp01(sweep - i);
      const absent = (r * 7 + col * 3) % 11 === 0;
      const v = absent ? 70 : Math.round(90 + on * 165);
      c.fillStyle = shade(c, y - 10, y + 16, v, v * 0.5);
      c.beginPath();
      c.arc(x, y - 4, 6, 0, TAU);
      c.fill();
      c.beginPath();
      c.ellipse(x, y + 12, 9, 7, 0, Math.PI, TAU);
      c.fill();
      if (on > 0 && !absent) {
        // Check badge on the student's shoulder
        const bx2 = x + 8;
        const by2 = y + 7;
        c.fillStyle = gray(255, on);
        c.beginPath();
        c.arc(bx2, by2, 5.5 * (0.6 + on * 0.4), 0, TAU);
        c.fill();
        c.strokeStyle = gray(15);
        c.lineWidth = 1.8;
        c.beginPath();
        c.moveTo(bx2 - 2.5, by2);
        c.lineTo(bx2 - 0.5, by2 + 2);
        c.lineTo(bx2 + 3, by2 - 2.5);
        c.stroke();
      }
    }
  }
};

/* ------------------------------------------------------------------ Data61 */

/** A lit globe; phishing hot spots flare and arcs link them into campaigns. */
const data61: SceneFn = (c, t) => {
  const R = 66;
  const spin = t * 0.45;
  const tilt = 0.35;
  const proj = (lat: number, lon: number): [number, number, number] => {
    const x = Math.cos(lat) * Math.sin(lon + spin);
    const z = Math.cos(lat) * Math.cos(lon + spin);
    const y = Math.sin(lat);
    return [
      x * R,
      -(y * Math.cos(tilt) - z * Math.sin(tilt)) * R,
      y * Math.sin(tilt) + z * Math.cos(tilt),
    ];
  };
  glow(c, 0, 0, R * 1.35, 60);
  const sphere = c.createRadialGradient(-R * 0.4, -R * 0.45, R * 0.1, 0, 0, R);
  sphere.addColorStop(0, gray(150));
  sphere.addColorStop(0.7, gray(55));
  sphere.addColorStop(1, gray(20));
  c.fillStyle = sphere;
  c.beginPath();
  c.arc(0, 0, R, 0, TAU);
  c.fill();
  c.strokeStyle = gray(200, 0.55);
  c.lineWidth = 1;
  const trace = (
    fn: (u: number) => [number, number, number],
    from: number,
    to: number,
  ) => {
    c.beginPath();
    let pen = false;
    for (let u = from; u <= to; u += 5) {
      const [x, y, z] = fn((u * Math.PI) / 180);
      if (z > 0) {
        if (pen) c.lineTo(x, y);
        else c.moveTo(x, y);
        pen = true;
      } else pen = false;
    }
    c.stroke();
  };
  for (let lat = -60; lat <= 60; lat += 30)
    trace((u) => proj((lat * Math.PI) / 180, u), 0, 360);
  for (let lon = 0; lon < 360; lon += 30)
    trace((u) => proj(u, (lon * Math.PI) / 180), -90, 90);
  const hot: Array<[number, number]> = [];
  for (let i = 0; i < 70; i++) {
    const lat = Math.asin(1 - (2 * (i + 0.5)) / 70);
    const [x, y, z] = proj(lat, i * 2.3999);
    if (z <= 0.05) continue;
    const flare = Math.sin(i * 1.7 + Math.floor(t * 1.2) * 2.1) > 0.8;
    c.fillStyle = gray(flare ? 255 : Math.round(110 + z * 80));
    c.beginPath();
    c.arc(x, y, flare ? 3 : 1.5, 0, TAU);
    c.fill();
    if (flare) {
      glow(c, x, y, 12, 255);
      hot.push([x, y]);
    }
  }
  c.strokeStyle = gray(255, 0.85);
  c.lineWidth = 1.8;
  for (let k = 1; k < hot.length; k++) {
    const a = hot[k - 1];
    const b = hot[k];
    if (!a || !b) continue;
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2 - Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.45;
    c.beginPath();
    c.moveTo(a[0], a[1]);
    c.quadraticCurveTo(mx, my, b[0], b[1]);
    c.stroke();
    const s = (t * 0.9 + k * 0.3) % 1;
    const sx = (1 - s) ** 2 * a[0] + 2 * (1 - s) * s * mx + s * s * b[0];
    const sy = (1 - s) ** 2 * a[1] + 2 * (1 - s) * s * my + s * s * b[1];
    glow(c, sx, sy, 7, 255);
  }
};

/* --------------------------------------------------------------------- IBM */

/** A smartwatch: approve prompt with a countdown, a tap, then a big tick. */
const ibm: SceneFn = (c, t) => {
  const cycle = t % 4;
  c.fillStyle = shade(c, -86, 86, 120, 40);
  rr(c, -26, -86, 52, 40, 8);
  c.fill();
  rr(c, -26, 46, 52, 40, 8);
  c.fill();
  c.fillStyle = gray(15);
  for (let k = 0; k < 3; k++) {
    c.beginPath();
    c.arc(0, 60 + k * 8, 2, 0, TAU);
    c.fill();
  }
  if (cycle < 2.6) {
    for (let k = 0; k < 2; k++) {
      const p = (t * 2 + k / 2) % 1;
      c.strokeStyle = gray(255, (1 - p) * 0.7);
      c.lineWidth = 2;
      for (const side of [0, Math.PI]) {
        c.beginPath();
        c.arc(0, 0, 60 + p * 24, side - 0.5, side + 0.5);
        c.stroke();
      }
    }
  }
  c.fillStyle = shade(c, -58, 58, 235, 90);
  rr(c, -48, -58, 96, 116, 26);
  c.fill();
  c.fillStyle = gray(200);
  rr(c, 46, -14, 8, 22, 3);
  c.fill();
  c.fillStyle = gray(8);
  rr(c, -41, -51, 82, 102, 21);
  c.fill();
  if (cycle < 2.6) {
    c.fillStyle = shade(c, -36, 0, 255, 150);
    c.beginPath();
    c.moveTo(0, -38);
    c.lineTo(14, -32);
    c.quadraticCurveTo(14, -12, 0, -4);
    c.quadraticCurveTo(-14, -12, -14, -32);
    c.closePath();
    c.fill();
    c.fillStyle = gray(10);
    c.beginPath();
    c.arc(0, -25, 4, 0, TAU);
    c.fill();
    c.fillRect(-1.5, -23, 3, 10);
    const left = 1 - cycle / 2.6;
    c.strokeStyle = gray(60);
    c.lineWidth = 3;
    c.beginPath();
    c.arc(0, -21, 25, 0, TAU);
    c.stroke();
    c.strokeStyle = gray(255);
    c.beginPath();
    c.arc(0, -21, 25, -Math.PI / 2, -Math.PI / 2 + TAU * left);
    c.stroke();
    const press = clamp01((cycle - 2.1) * 4);
    c.fillStyle = gray(70);
    rr(c, -32, 16, 28, 22, 8);
    c.fill();
    c.fillStyle = gray(Math.round(150 + press * 105));
    rr(c, 4, 16 + press * 2, 28, 22, 8);
    c.fill();
    c.lineWidth = 3;
    c.strokeStyle = gray(20);
    c.beginPath();
    c.moveTo(11, 27 + press * 2);
    c.lineTo(16, 32 + press * 2);
    c.lineTo(25, 22 + press * 2);
    c.stroke();
    c.strokeStyle = gray(200);
    c.beginPath();
    c.moveTo(-23, 22);
    c.lineTo(-13, 32);
    c.moveTo(-13, 22);
    c.lineTo(-23, 32);
    c.stroke();
  } else {
    const k = ease(clamp01((cycle - 2.6) * 2.5));
    glow(c, 0, 0, 40 * k, 120);
    c.fillStyle = gray(255);
    c.beginPath();
    c.arc(0, 0, Math.max(0.1, 26 * k), 0, TAU);
    c.fill();
    c.strokeStyle = gray(10);
    c.lineWidth = 5;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(-11 * k, 0);
    c.lineTo(-3 * k, 9 * k);
    c.lineTo(13 * k, -9 * k);
    c.stroke();
    c.lineCap = "butt";
  }
  const sheen = c.createLinearGradient(-41, -51, 20, 10);
  sheen.addColorStop(0, gray(255, 0.18));
  sheen.addColorStop(0.5, gray(255, 0));
  c.fillStyle = sheen;
  rr(c, -41, -51, 82, 102, 21);
  c.fill();
};

export const COMPANY_GLYPHS: Record<string, SceneFn> = {
  kodo: thanks,
  "commbank-staff": commbankStaff,
  "commbank-senior": commbankSenior,
  quantium,
  "school-bytes": schoolBytes,
  data61,
  ibm,
};

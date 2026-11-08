import { blob, cluster, type Dot, line, ring, TAU } from "./glyphs.ts";

/**
 * Dot-matrix previews for the companies index, one per role, in the brain's
 * square-dot style. Coordinates are CSS px around (0,0), roughly ±60 × ±40.
 */

/** A gift card with a bow; sparkles pop as rewards are claimed. */
const thanks = (t: number): Dot[] => {
  const d: Dot[] = [];
  line(d, -40, -24, 40, -24, 26, 0.6);
  line(d, -40, 24, 40, 24, 26, 0.6);
  line(d, -40, -24, -40, 24, 16, 0.6);
  line(d, 40, -24, 40, 24, 16, 0.6);
  line(d, -14, -24, -14, 24, 16, 0.85); // ribbon
  line(d, -40, -4, 40, -4, 26, 0.85);
  ring(d, -21, -10, 6, 10, 0.95, t);
  ring(d, -7, -10, 6, 10, 0.95, -t);
  // Card number placeholder
  for (let i = 0; i < 6; i++) d.push([6 + i * 5, 14, 0.45]);
  // Sparkles
  for (let k = 0; k < 4; k++) {
    const life = (t * 0.8 + k * 0.25) % 1;
    const x = -30 + k * 22;
    const y = -30 - life * 14;
    const a = 1 - life;
    d.push(
      [x, y, a],
      [x - 2, y, a * 0.6],
      [x + 2, y, a * 0.6],
      [x, y - 2, a * 0.6],
      [x, y + 2, a * 0.6],
    );
  }
  return d;
};

/** A padlock that unlocks, ticks, and locks again. */
const commbankStaff = (t: number): Dot[] => {
  const d: Dot[] = [];
  const phase = t % 3;
  const open = phase > 1 && phase < 2.2 ? Math.min(1, (phase - 1) * 4) : 0;
  // Shackle
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI + (i / 16) * Math.PI;
    d.push([Math.cos(a) * 14, -6 - open * 8 + Math.sin(a) * 16, 0.9]);
  }
  line(d, 14, -6 - open * 8, 14, -2, 2, 0.9);
  // Body
  blob(d, 0, 12, 22, 14, 3.4, 0.45);
  line(d, -22, -2, 22, -2, 14, 0.8);
  line(d, -22, 26, 22, 26, 14, 0.8);
  ring(d, 0, 8, 3, 8, 1);
  line(d, 0, 11, 0, 17, 2, 1);
  if (open > 0.9) {
    // Tick beside the lock
    line(d, 30, 4, 35, 10, 3, 1);
    line(d, 35, 10, 46, -4, 5, 1);
  }
  return d;
};

/** Candlesticks scrolling past with a moving price line. */
const commbankSenior = (t: number): Dot[] => {
  const d: Dot[] = [];
  line(d, -52, 32, 52, 32, 34, 0.35);
  const shift = (t * 14) % 12;
  for (let i = 0; i < 10; i++) {
    const x = -50 + i * 12 - shift;
    if (x < -52) continue;
    const k = i + Math.floor((t * 14) / 12);
    const mid = Math.sin(k * 0.9) * 10 + Math.sin(k * 0.37) * 8 - 4;
    const body = 5 + Math.abs(Math.sin(k * 1.7)) * 9;
    const up = Math.sin(k * 2.3) > 0;
    line(d, x, mid - body - 5, x, mid + body + 5, 6, 0.4);
    for (let y = mid - body; y <= mid + body; y += 3) {
      d.push([x - 2, y, up ? 1 : 0.55], [x + 2, y, up ? 1 : 0.55]);
    }
  }
  // Last price
  const last = Math.sin(t * 2) * 6 - 4;
  for (let x = -52; x <= 52; x += 4) d.push([x, last, 0.25]);
  return d;
};

/** Bars rise while a lens scans for the insight. */
const quantium = (t: number): Dot[] => {
  const d: Dot[] = [];
  line(d, -48, 30, 48, 30, 32, 0.4);
  for (let i = 0; i < 8; i++) {
    const h = 8 + (Math.sin(i * 1.3 + t * 1.5) * 0.5 + 0.5) * 40;
    for (let y = 0; y < h; y += 4)
      d.push([-42 + i * 12, 27 - y, 0.55], [-39 + i * 12, 27 - y, 0.55]);
  }
  const lx = Math.sin(t * 0.9) * 34;
  ring(d, lx, -8, 12, 22, 1);
  line(d, lx + 8, 1, lx + 16, 9, 3, 1);
  return d;
};

/** A class roll: attendance ticks fill in row by row. */
const schoolBytes = (t: number): Dot[] => {
  const d: Dot[] = [];
  const cols = 7;
  const rows = 4;
  const filled = Math.floor((t * 6) % (cols * rows + 6));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const x = -42 + c * 14;
      const y = -18 + r * 14;
      if (i < filled) {
        const absent = (i * 7) % 11 === 0;
        if (absent) {
          line(d, x - 3, y - 3, x + 3, y + 3, 2, 0.6);
          line(d, x - 3, y + 3, x + 3, y - 3, 2, 0.6);
        } else {
          line(d, x - 3, y, x - 1, y + 3, 1, 1);
          line(d, x - 1, y + 3, x + 4, y - 3, 3, 1);
        }
      } else {
        d.push([x, y, 0.3]);
      }
    }
  }
  line(d, -50, -28, 50, -28, 30, 0.45);
  return d;
};

/** A spinning globe of reports with phishing clusters flaring up. */
const data61 = (t: number): Dot[] => {
  const d: Dot[] = [];
  const n = 160;
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n;
    const r = Math.sqrt(1 - y * y);
    const a = i * 2.399963 + t * 0.6;
    const z = Math.sin(a) * r;
    if (z < -0.2) continue;
    const hot = Math.sin(i * 0.7 + Math.floor(t * 2)) > 0.93;
    d.push([Math.cos(a) * r * 34, y * 34, hot ? 1 : 0.25 + z * 0.4]);
    if (hot)
      ring(d, Math.cos(a) * r * 34, y * 34, 4 + ((t * 2) % 1) * 4, 6, 0.6);
  }
  return d;
};

/** A watch face counting down a one-time code. */
const ibm = (t: number): Dot[] => {
  const d: Dot[] = [];
  line(d, -24, -30, 24, -30, 16, 0.7);
  line(d, -24, 30, 24, 30, 16, 0.7);
  line(d, -28, -26, -28, 26, 17, 0.7);
  line(d, 28, -26, 28, 26, 17, 0.7);
  line(d, -14, -30, -14, -42, 4, 0.35); // strap
  line(d, 14, -30, 14, -42, 4, 0.35);
  line(d, -14, 30, -14, 42, 4, 0.35);
  line(d, 14, 30, 14, 42, 4, 0.35);
  const cycle = (t / 4) % 1;
  // Countdown ring
  const n = 28;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / n) * TAU;
    d.push([Math.cos(a) * 20, Math.sin(a) * 20, i / n > cycle ? 0.9 : 0.15]);
  }
  // Six code digits as small bars that reshuffle each cycle
  const seed = Math.floor(t / 4);
  for (let k = 0; k < 6; k++) {
    const h = 2 + ((seed * 7 + k * 3) % 4);
    for (let j = 0; j < h; j++) d.push([-12.5 + k * 5, 4 - j * 2.5, 1]);
  }
  cluster(d, 0, 12, 0.6);
  return d;
};

export const COMPANY_GLYPHS: Record<string, (t: number) => Dot[]> = {
  thanks,
  "commbank-staff": commbankStaff,
  "commbank-senior": commbankSenior,
  quantium,
  "school-bytes": schoolBytes,
  data61,
  ibm,
};

import type { SceneFn } from "./halftone.ts";
import type { Region } from "./points.ts";

/**
 * Vector scenes for each brain region's callout, drawn white on black around
 * (0,0) within roughly ±70 × ±50 CSS px. `drawCallout` turns them into the
 * square-dot halftone. No text.
 */

const TAU = Math.PI * 2;
const ease = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const gray = (v: number, a = 1) =>
  `rgba(${Math.round(v)},${Math.round(v)},${Math.round(v)},${a})`;
const shade = (
  c: CanvasRenderingContext2D,
  y0: number,
  y1: number,
  top: number,
  bottom: number,
) => {
  const g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, gray(top));
  g.addColorStop(1, gray(bottom));
  return g;
};
const radial = (
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  inner: number,
  outer: number,
) => {
  const g = c.createRadialGradient(
    x - r * 0.35,
    y - r * 0.35,
    r * 0.05,
    x,
    y,
    r,
  );
  g.addColorStop(0, gray(inner));
  g.addColorStop(1, gray(outer));
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

/* --------------------------------------------------------------- DJing */

const platter = (
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  spin: number,
) => {
  // Plinth shadow + platter rim
  c.fillStyle = gray(40);
  c.beginPath();
  c.arc(x, y, r + 3, 0, TAU);
  c.fill();
  c.fillStyle = radial(c, x, y, r, 200, 90);
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.fill();
  // Grooves
  c.strokeStyle = gray(20, 0.8);
  c.lineWidth = 1.2;
  for (let k = r - 3; k > r * 0.38; k -= 3.2) {
    c.beginPath();
    c.arc(x, y, k, 0, TAU);
    c.stroke();
  }
  // Light catching the vinyl, rotating with it
  c.strokeStyle = gray(255);
  c.lineWidth = 3;
  c.beginPath();
  c.arc(x, y, r * 0.72, spin, spin + 0.6);
  c.stroke();
  c.beginPath();
  c.arc(x, y, r * 0.72, spin + Math.PI, spin + Math.PI + 0.6);
  c.stroke();
  // Label + marker
  c.fillStyle = radial(c, x, y, r * 0.34, 255, 170);
  c.beginPath();
  c.arc(x, y, r * 0.34, 0, TAU);
  c.fill();
  c.fillStyle = gray(30);
  c.beginPath();
  c.arc(
    x + Math.cos(spin) * r * 0.22,
    y + Math.sin(spin) * r * 0.22,
    1.8,
    0,
    TAU,
  );
  c.fill();
  c.beginPath();
  c.arc(x, y, 1.5, 0, TAU);
  c.fill();
};

const tonearm = (
  c: CanvasRenderingContext2D,
  px: number,
  py: number,
  angle: number,
  len: number,
) => {
  c.fillStyle = radial(c, px, py, 5, 255, 120);
  c.beginPath();
  c.arc(px, py, 5, 0, TAU);
  c.fill();
  c.strokeStyle = gray(220);
  c.lineWidth = 2.5;
  c.lineCap = "round";
  const ex = px + Math.cos(angle) * len;
  const ey = py + Math.sin(angle) * len;
  c.beginPath();
  c.moveTo(px, py);
  c.lineTo(ex, ey);
  c.stroke();
  c.lineCap = "butt";
  c.fillStyle = gray(255);
  c.save();
  c.translate(ex, ey);
  c.rotate(angle);
  c.fillRect(-2, -3, 7, 6);
  c.restore();
};

/** Two decks spinning either side of a mixer; faders ride and meters bounce. */
const djing: SceneFn = (c, t) => {
  // Console body
  c.fillStyle = shade(c, -40, 44, 70, 25);
  rr(c, -68, -38, 136, 80, 8);
  c.fill();
  c.strokeStyle = gray(150);
  c.lineWidth = 1;
  c.stroke();
  const beat = (t * 2) % 1;
  platter(c, -38, 2, 26, t * 3.5);
  platter(c, 38, 2, 26, -t * 3.5 + 1);
  tonearm(c, -14, -28, 2.05 + Math.sin(t * 0.3) * 0.03, 26);
  tonearm(c, 62, -28, 2.05 + Math.sin(t * 0.3 + 1) * 0.03, 26);
  // Mixer strip
  c.fillStyle = gray(25);
  rr(c, -9, -34, 18, 72, 3);
  c.fill();
  // Level meters (two columns of LEDs)
  for (let ch = 0; ch < 2; ch++) {
    const lvl =
      0.35 + Math.abs(Math.sin(t * 7 + ch * 1.3)) * 0.5 * (1 - beat * 0.5);
    for (let k = 0; k < 7; k++) {
      const on = k / 7 < lvl;
      c.fillStyle = gray(on ? 255 - k * 10 : 60);
      c.fillRect(-6 + ch * 8, 2 - k * 5, 4, 3);
    }
  }
  // Crossfader
  c.fillStyle = gray(70);
  c.fillRect(-7, 27, 14, 2);
  c.fillStyle = shade(c, 23, 33, 255, 160);
  rr(c, -3 + Math.sin(t * 1.4) * 4, 23, 6, 10, 1);
  c.fill();
  // Beat pulse on the console edge
  glow(c, 0, -40, 22 * (1 - beat), 180 * (1 - beat));
};

/* ----------------------------------------------------------- Bouldering */

const HOLDS: ReadonlyArray<[number, number, number]> = [
  [-10, 38, 5],
  [10, 24, 4],
  [-8, 10, 5],
  [12, -4, 4],
  [-2, -18, 5],
  [18, -30, 4],
  [6, -42, 5],
];
const SPARE: ReadonlyArray<[number, number, number]> = [
  [-30, 30, 3],
  [30, 34, 4],
  [-32, -4, 4],
  [34, 8, 3],
  [-22, -34, 3],
  [38, -16, 3],
];

const hold = (
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  v: number,
) => {
  c.fillStyle = radial(c, x, y, r, v, v * 0.35);
  c.beginPath();
  c.ellipse(x, y, r * 1.2, r, 0.4, 0, TAU);
  c.fill();
};

/** A climber moves hold to hold up an overhang, chalk puffing on each catch. */
const bouldering: SceneFn = (c, t) => {
  // Wall panel with perspective shading (overhang darker at the top)
  c.fillStyle = shade(c, -50, 50, 22, 55);
  c.beginPath();
  c.moveTo(-46, 50);
  c.lineTo(-36, -50);
  c.lineTo(56, -50);
  c.lineTo(46, 50);
  c.closePath();
  c.fill();
  c.strokeStyle = gray(30, 0.7);
  c.lineWidth = 0.8;
  for (let k = -40; k < 50; k += 20) {
    c.beginPath();
    c.moveTo(-46 + (50 - k) * 0.1, k);
    c.lineTo(46 + (50 - k) * 0.1, k);
    c.stroke();
  }
  // Crash pad
  c.fillStyle = shade(c, 44, 52, 150, 70);
  rr(c, -60, 44, 120, 8, 2);
  c.fill();
  for (const [x, y, r] of SPARE) hold(c, x, y, r * 1.2, 150);

  const moves = HOLDS.length - 1;
  const cycle = (t * 0.85) % (moves + 1.2);
  const step = Math.min(moves - 1, Math.floor(cycle));
  const raw = Math.min(1, cycle - step);
  const e = ease(raw);
  HOLDS.forEach(([x, y, r], i) => {
    hold(c, x, y, r * 1.25, i === step + 1 ? 255 : i <= step ? 230 : 190);
    if (i === step + 1) glow(c, x, y, r * 3, 120);
  });
  const from = HOLDS[step] ?? [0, 0, 0];
  const to = HOLDS[step + 1] ?? from;
  // Body hangs off the reaching hand
  const hx = from[0] + (to[0] - from[0]) * e;
  const hy = from[1] + (to[1] - from[1]) * e;
  const shoulder: [number, number] = [hx - 4, hy + 12];
  const hip: [number, number] = [shoulder[0] + 2, shoulder[1] + 16];
  const kick = Math.sin(t * 5) * 3;
  c.strokeStyle = gray(255);
  c.lineCap = "round";
  c.lineJoin = "round";
  // Torso
  c.lineWidth = 7;
  c.beginPath();
  c.moveTo(...shoulder);
  c.lineTo(...hip);
  c.stroke();
  // Arms
  c.lineWidth = 3.5;
  c.beginPath();
  c.moveTo(...shoulder);
  c.quadraticCurveTo(shoulder[0] + 6, shoulder[1] - 6, to[0], to[1]);
  c.moveTo(...shoulder);
  c.quadraticCurveTo(shoulder[0] - 8, shoulder[1] - 2, from[0], from[1]);
  c.stroke();
  // Legs
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(...hip);
  c.lineTo(hip[0] - 8, hip[1] + 8);
  c.lineTo(hip[0] - 6, hip[1] + 16 + kick);
  c.moveTo(...hip);
  c.lineTo(hip[0] + 8, hip[1] + 6);
  c.lineTo(hip[0] + 10, hip[1] + 14 - kick);
  c.stroke();
  c.lineCap = "butt";
  // Head
  c.fillStyle = radial(c, shoulder[0] - 2, shoulder[1] - 7, 4.5, 255, 190);
  c.beginPath();
  c.arc(shoulder[0] - 2, shoulder[1] - 7, 4.5, 0, TAU);
  c.fill();
  // Chalk puff on the catch
  if (raw > 0.82) {
    const p = (raw - 0.82) / 0.18;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU;
      glow(
        c,
        to[0] + Math.cos(a) * p * 10,
        to[1] + Math.sin(a) * p * 8,
        4 * (1 - p) + 1,
        255 * (1 - p),
      );
    }
  }
};

/* --------------------------------------------------------------- Gaming */

/**
 * PC gaming, first person: the view tracks a strafing enemy down a corridor;
 * each shot kicks the gun, flashes the muzzle and lands a hit marker. WASD
 * light up as the player strafes and the mouse clicks with every shot.
 */
const gaming: SceneFn = (c, t) => {
  const SX = -48;
  const SY = -50;
  const SW = 96;
  const SH = 56;
  const cx = 0;
  const cy = SY + SH / 2 - 2;

  // Enemy strafes; the camera follows a beat behind, so aim drifts on and off.
  const enemy = Math.sin(t * 0.75) * 30;
  const cam = Math.sin((t - 0.35) * 0.75) * 30;
  const camVel = Math.cos((t - 0.35) * 0.75);
  const rel = enemy - cam;
  const shot = (t * 1.4) % 1;
  const firing = shot < 0.14;
  const onTarget = Math.abs(rel) < 7;
  const hitFlash = onTarget && shot > 0.05 && shot < 0.3;
  const kick = firing ? 1 - shot / 0.14 : 0;

  // The monitor fills most of the frame so the FPS reads at callout size.
  c.save();
  c.translate(0, 18);
  c.scale(1.38, 1.38);
  glow(c, 0, -18, 70, 45);
  c.fillStyle = shade(c, -54, 12, 190, 80);
  rr(c, SX - 4, SY - 4, SW + 8, SH + 10, 4);
  c.fill();
  c.save();
  c.beginPath();
  c.rect(SX, SY, SW, SH);
  c.clip();
  // Recoil nudges the whole view up a touch
  c.translate(0, -kick * 1.5);
  const vx = cx - cam * 0.35;
  const horizon = cy + 2;
  // Ceiling + floor
  c.fillStyle = shade(c, SY, horizon, 12, 40);
  c.fillRect(SX, SY, SW, horizon - SY);
  c.fillStyle = shade(c, horizon, SY + SH, 40, 95);
  c.fillRect(SX, horizon, SW, SY + SH - horizon);
  // Corridor walls
  c.fillStyle = shade(c, SY, SY + SH, 75, 25);
  c.beginPath();
  c.moveTo(SX, SY);
  c.lineTo(vx - 14, horizon - 12);
  c.lineTo(vx - 14, horizon + 6);
  c.lineTo(SX, SY + SH);
  c.closePath();
  c.fill();
  c.fillStyle = shade(c, SY, SY + SH, 60, 20);
  c.beginPath();
  c.moveTo(SX + SW, SY);
  c.lineTo(vx + 14, horizon - 12);
  c.lineTo(vx + 14, horizon + 6);
  c.lineTo(SX + SW, SY + SH);
  c.closePath();
  c.fill();
  // Far doorway glow
  glow(c, vx, horizon - 3, 10, 150);
  // Floor lines converging on the vanishing point, scrolling toward us
  c.strokeStyle = gray(160, 0.35);
  c.lineWidth = 1;
  for (let k = -3; k <= 3; k++) {
    c.beginPath();
    c.moveTo(vx + k * 3, horizon + 6);
    c.lineTo(cx + k * 30 - cam * 0.6, SY + SH);
    c.stroke();
  }
  for (let k = 0; k < 5; k++) {
    const d = ((k + ((t * 0.8) % 1)) / 5) ** 2;
    const y = horizon + 6 + d * (SY + SH - horizon - 6);
    c.globalAlpha = d;
    c.beginPath();
    c.moveTo(SX, y);
    c.lineTo(SX + SW, y);
    c.stroke();
  }
  c.globalAlpha = 1;
  // Enemy: head + shoulders, flashes on a hit
  const ex = cx + rel;
  const ey = horizon - 2;
  c.fillStyle = hitFlash ? gray(255) : shade(c, ey - 16, ey + 6, 235, 120);
  c.beginPath();
  c.arc(ex, ey - 12, 3.6, 0, TAU);
  c.fill();
  rr(c, ex - 6, ey - 8, 12, 15, 3);
  c.fill();
  if (hitFlash) glow(c, ex, ey - 6, 12, 255);
  // Crosshair
  c.strokeStyle = gray(255);
  c.lineWidth = 1.4;
  const gap = 3 + kick * 3;
  c.beginPath();
  c.moveTo(cx - gap - 5, cy);
  c.lineTo(cx - gap, cy);
  c.moveTo(cx + gap, cy);
  c.lineTo(cx + gap + 5, cy);
  c.moveTo(cx, cy - gap - 5);
  c.lineTo(cx, cy - gap);
  c.moveTo(cx, cy + gap);
  c.lineTo(cx, cy + gap + 5);
  c.stroke();
  // Hit marker
  if (hitFlash) {
    c.lineWidth = 1.8;
    c.beginPath();
    for (const [dx, dy] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ] as const) {
      c.moveTo(cx + dx * 4, cy + dy * 4);
      c.lineTo(cx + dx * 8, cy + dy * 8);
    }
    c.stroke();
  }
  c.restore();

  // Gun (outside the recoil translate so it kicks on its own), clipped to screen
  c.save();
  c.beginPath();
  c.rect(SX, SY, SW, SH);
  c.clip();
  const gx = 22 + kick * 3;
  const gy = SY + SH - 2 + kick * 4;
  c.fillStyle = shade(c, gy - 22, gy, 210, 70);
  c.beginPath();
  c.moveTo(gx - 6, gy - 20);
  c.lineTo(gx + 4, gy - 22);
  c.lineTo(gx + 22, gy);
  c.lineTo(gx + 2, gy);
  c.closePath();
  c.fill();
  c.fillStyle = gray(240);
  c.fillRect(gx - 4, gy - 21, 6, 2);
  if (firing) {
    glow(c, gx - 6, gy - 22, 14 * kick + 4, 255);
    c.fillStyle = gray(255);
    c.beginPath();
    c.moveTo(gx - 12, gy - 26);
    c.lineTo(gx - 4, gy - 22);
    c.lineTo(gx - 10, gy - 18);
    c.closePath();
    c.fill();
  }
  // HUD: health bar + ammo pips
  c.fillStyle = gray(70);
  c.fillRect(SX + 4, SY + SH - 6, 26, 3);
  c.fillStyle = gray(235);
  c.fillRect(SX + 4, SY + SH - 6, 20, 3);
  const ammo = 12 - (Math.floor(t * 1.4) % 13);
  for (let k = 0; k < 12; k++) {
    c.fillStyle = gray(k < ammo ? 230 : 60);
    c.fillRect(SX + 4 + k * 2.5, SY + SH - 11, 1.5, 3);
  }
  c.restore();
  // Screen sheen + stand
  const sheen = c.createLinearGradient(SX, SY, 0, SY + SH);
  sheen.addColorStop(0, gray(255, 0.08));
  sheen.addColorStop(0.5, gray(255, 0));
  c.fillStyle = sheen;
  c.fillRect(SX, SY, SW, SH);
  c.restore();

  // Compact WASD cluster: W held, A/D as the view strafes
  const pressed = new Set<string>(["W"]);
  if (camVel > 0.35) pressed.add("D");
  if (camVel < -0.35) pressed.add("A");
  const keys: ReadonlyArray<[string, number, number]> = [
    ["W", -40, 38],
    ["A", -49, 46],
    ["S", -40, 46],
    ["D", -31, 46],
  ];
  for (const [k2, x, y] of keys) {
    const on = pressed.has(k2);
    c.fillStyle = on ? gray(255) : shade(c, y, y + 7, 150, 80);
    rr(c, x - 4, y + (on ? 1 : 0), 8, 7, 1.5);
    c.fill();
    if (on) glow(c, x, y + 4, 9, 200);
  }
  c.fillStyle = shade(c, 46, 53, 130, 70);
  rr(c, -20, 46, 34, 7, 1.5);
  c.fill();

  // Mouse follows the aim; left button flashes with each shot
  const mx = 44 + cam * 0.15;
  const my = 46;
  c.fillStyle = radial(c, mx, my, 9, 230, 90);
  c.beginPath();
  c.ellipse(mx, my, 6.5, 8.5, 0, 0, TAU);
  c.fill();
  c.fillStyle = gray(firing ? 255 : 120);
  c.beginPath();
  c.ellipse(mx - 3, my - 4, 3, 4, 0, Math.PI, TAU);
  c.fill();
  if (firing) glow(c, mx - 3, my - 6, 8, 255);
};

/* ----------------------------------------------------------------- Dogs */

/** A sitting dog: tail wags, head tilts, ear flops, hearts drift up. */
const dogs: SceneFn = (c, t) => {
  const tilt = Math.sin(t * 1.6) * 0.08;
  const wag = Math.sin(t * 13) * 0.5;
  // Ground shadow
  glow(c, 2, 48, 40, 50);
  // Tail
  c.save();
  c.translate(24, 22);
  c.rotate(-1.1 + wag);
  c.strokeStyle = shade(c, -20, 0, 240, 160);
  c.lineWidth = 6;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(0, 0);
  c.quadraticCurveTo(4, -12, 0, -22);
  c.stroke();
  c.restore();
  // Body + haunch
  c.fillStyle = shade(c, -6, 48, 230, 90);
  c.beginPath();
  c.ellipse(6, 22, 22, 24, 0.15, 0, TAU);
  c.fill();
  c.beginPath();
  c.ellipse(18, 36, 14, 12, 0, 0, TAU);
  c.fill();
  // Chest highlight
  c.fillStyle = gray(255, 0.4);
  c.beginPath();
  c.ellipse(-6, 14, 7, 14, 0.2, 0, TAU);
  c.fill();
  // Front legs + paws
  c.fillStyle = shade(c, 20, 48, 220, 120);
  rr(c, -12, 22, 8, 26, 4);
  c.fill();
  rr(c, -2, 24, 8, 24, 4);
  c.fill();
  c.fillStyle = gray(255);
  c.beginPath();
  c.ellipse(-8, 47, 6, 3, 0, 0, TAU);
  c.ellipse(2, 47, 6, 3, 0, 0, TAU);
  c.fill();
  // Head
  c.save();
  c.translate(-10, -14);
  c.rotate(tilt);
  c.fillStyle = radial(c, 0, 0, 16, 255, 130);
  c.beginPath();
  c.ellipse(0, 0, 15, 14, 0, 0, TAU);
  c.fill();
  // Snout
  c.fillStyle = shade(c, -2, 10, 240, 170);
  c.beginPath();
  c.ellipse(-14, 4, 10, 7, -0.1, 0, TAU);
  c.fill();
  c.fillStyle = gray(15);
  c.beginPath();
  c.ellipse(-22, 1, 3.5, 2.8, 0, 0, TAU);
  c.fill();
  // Eye + glint
  c.beginPath();
  c.arc(-4, -3, 2.5, 0, TAU);
  c.fill();
  c.fillStyle = gray(255);
  c.beginPath();
  c.arc(-3.3, -3.8, 0.8, 0, TAU);
  c.fill();
  // Tongue (pants on the beat)
  const pant = Math.max(0, Math.sin(t * 6));
  c.fillStyle = gray(200);
  c.beginPath();
  c.ellipse(-14, 11 + pant * 2, 3, 3 + pant * 2, 0, 0, Math.PI);
  c.fill();
  // Floppy ear
  const flop = Math.sin(t * 1.6 + 0.7) * 0.15;
  c.fillStyle = shade(c, -12, 14, 140, 60);
  c.beginPath();
  c.ellipse(8, 1, 6, 13, 0.35 + flop, 0, TAU);
  c.fill();
  c.restore();
  // Hearts drift up
  for (let k = 0; k < 3; k++) {
    const life = (t * 0.45 + k / 3) % 1;
    const x = -26 + k * 14 + Math.sin(life * 7 + k) * 4;
    const y = -36 - life * 22;
    const s = 4 * (1 - life * 0.4);
    c.fillStyle = gray(255, 1 - life);
    c.beginPath();
    c.moveTo(x, y + s * 0.9);
    c.bezierCurveTo(
      x - s * 1.6,
      y - s * 0.2,
      x - s * 0.7,
      y - s * 1.3,
      x,
      y - s * 0.4,
    );
    c.bezierCurveTo(
      x + s * 0.7,
      y - s * 1.3,
      x + s * 1.6,
      y - s * 0.2,
      x,
      y + s * 0.9,
    );
    c.fill();
  }
};

/* ----------------------------------------------------------------- Tech */

const LINES: ReadonlyArray<ReadonlyArray<number>> = [
  [0, 14, 22, 8],
  [6, 18, 30],
  [12, 10, 26, 12],
  [12, 22, 10],
  [6, 12],
  [0, 26, 16],
  [6, 14, 20],
];
const TOTAL = LINES.reduce(
  (a, l) => a + l.slice(1).reduce((x, y) => x + y + 3, 0),
  0,
);

/** A monitor: code types itself in, the cursor blinks, then a deploy bar fills. */
const tech: SceneFn = (c, t) => {
  // Stand
  c.fillStyle = shade(c, 30, 50, 180, 70);
  c.beginPath();
  c.moveTo(-6, 30);
  c.lineTo(6, 30);
  c.lineTo(10, 44);
  c.lineTo(-10, 44);
  c.closePath();
  c.fill();
  rr(c, -26, 43, 52, 5, 2);
  c.fill();
  // Bezel + screen
  c.fillStyle = shade(c, -46, 32, 200, 90);
  rr(c, -66, -46, 132, 78, 6);
  c.fill();
  c.fillStyle = gray(10);
  rr(c, -62, -42, 124, 68, 3);
  c.fill();
  // Window chrome
  c.fillStyle = gray(45);
  c.fillRect(-62, -42, 124, 8);
  for (let k = 0; k < 3; k++) {
    c.fillStyle = gray(k === 0 ? 220 : 140);
    c.beginPath();
    c.arc(-56 + k * 6, -38, 1.8, 0, TAU);
    c.fill();
  }
  // Line-number gutter
  c.fillStyle = gray(30);
  c.fillRect(-62, -34, 10, 60);
  const speed = 60;
  const cycle = TOTAL / speed + 2.4;
  const u = t % cycle;
  let typed = u * speed;
  let cx = -48;
  let cy = -29;
  LINES.forEach((tokens, row) => {
    const y = -29 + row * 7.5;
    c.fillStyle = gray(70);
    c.fillRect(-59, y - 1, 4, 2);
    let x = -48 + (tokens[0] ?? 0);
    tokens.slice(1).forEach((len, k) => {
      if (typed <= 0) return;
      const w = Math.min(len, typed);
      typed -= len + 3;
      c.fillStyle = gray(k === 0 ? 255 : k === 1 ? 170 : 120);
      rr(c, x, y - 2, w, 4, 1.5);
      c.fill();
      cx = x + w + 2;
      cy = y;
      x += len + 3;
    });
  });
  if (Math.floor(t * 2.2) % 2 === 0) {
    c.fillStyle = gray(255);
    c.fillRect(cx, cy - 3, 2.5, 6);
  }
  // Deploy bar + success pulse
  const done = u - TOTAL / speed;
  if (done > 0) {
    const fill = ease(clamp01(done / 1.2));
    c.fillStyle = gray(50);
    rr(c, -48, 18, 96, 4, 2);
    c.fill();
    c.fillStyle = gray(255);
    rr(c, -48, 18, 96 * fill, 4, 2);
    c.fill();
    if (fill >= 1) {
      const p = clamp01((done - 1.2) / 1);
      glow(c, 54, 20, 6 + p * 14, 255 * (1 - p));
    }
  }
  // Screen sheen
  const sheen = c.createLinearGradient(-62, -42, 0, 26);
  sheen.addColorStop(0, gray(255, 0.12));
  sheen.addColorStop(0.5, gray(255, 0));
  c.fillStyle = sheen;
  c.fillRect(-62, -42, 124, 68);
};

/* ----------------------------------------------------------- Streetwear */

/** A clothes rail: an oversized boxy tee and baggy wide-leg pants sway in a breeze. */
const streetwear: SceneFn = (c, t) => {
  const breeze = (x: number, phase: number) =>
    Math.sin(t * 2.2 + x * 0.12 + phase) * 1.8;

  // Rail + uprights
  c.fillStyle = shade(c, -50, -44, 230, 140);
  c.fillRect(-66, -50, 132, 3);
  c.fillStyle = gray(110);
  c.fillRect(-66, -50, 2, 104);
  c.fillRect(64, -50, 2, 104);
  glow(c, 0, 52, 70, 40);

  const hanger = (x: number) => {
    c.strokeStyle = gray(230);
    c.lineWidth = 1.6;
    c.beginPath();
    c.arc(x, -46, 3, Math.PI, Math.PI * 2.4);
    c.moveTo(x, -43);
    c.lineTo(x, -40);
    c.stroke();
  };

  /* Oversized tee: dropped shoulders, boxy body, elbow-length sleeves. */
  c.save();
  c.translate(-28, -40);
  c.rotate(Math.sin(t * 1.1) * 0.05);
  c.translate(28, 40);
  hanger(-28);
  c.strokeStyle = gray(230);
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(-48, -32);
  c.lineTo(-28, -40);
  c.lineTo(-8, -32);
  c.stroke();
  const hem = (x: number) => 30 + breeze(x, 0);
  c.fillStyle = shade(c, -38, 32, 245, 120);
  c.beginPath();
  c.moveTo(-36, -37); // collar left
  c.quadraticCurveTo(-28, -31, -20, -37); // neckline
  c.lineTo(-2, -32); // right shoulder (dropped, wide)
  c.lineTo(8, -10); // right sleeve outer
  c.lineTo(-2, -6); // right sleeve hem
  c.lineTo(-4, -12); // underarm
  c.lineTo(-4, 30);
  for (let x = -4; x >= -52; x -= 4) c.lineTo(x, hem(x));
  c.lineTo(-52, -12);
  c.lineTo(-54, -6);
  c.lineTo(-64, -10);
  c.lineTo(-54, -32);
  c.closePath();
  c.fill();
  // Collar rib
  c.strokeStyle = gray(120);
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(-36, -37);
  c.quadraticCurveTo(-28, -30, -20, -37);
  c.stroke();
  // Folds + shadow under the dropped shoulders
  c.strokeStyle = gray(110, 0.7);
  c.lineWidth = 1.2;
  for (const [x0, y0, x1, y1] of [
    [-44, -8, -40, 26],
    [-30, -2, -32, 28],
    [-16, -10, -12, 26],
  ] as const) {
    c.beginPath();
    c.moveTo(x0, y0);
    c.quadraticCurveTo(
      (x0 + x1) / 2 + breeze(x0, 1) * 0.6,
      (y0 + y1) / 2,
      x1,
      y1,
    );
    c.stroke();
  }
  // Chest graphic
  c.fillStyle = gray(40);
  c.fillRect(-36, -22, 16, 9);
  c.fillStyle = gray(220);
  c.fillRect(-34, -20, 5, 5);
  c.fillRect(-27, -20, 5, 2);
  c.fillRect(-27, -17, 3, 2);
  c.restore();

  /* Baggy pants: clipped at the waistband, wide legs stacking at the hem. */
  c.save();
  c.translate(32, -40);
  c.rotate(Math.sin(t * 1.1 + 1.2) * 0.05);
  c.translate(-32, 40);
  hanger(32);
  c.strokeStyle = gray(230);
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(14, -36);
  c.lineTo(50, -36);
  c.stroke();
  for (const x of [16, 48]) {
    c.fillStyle = gray(200);
    c.fillRect(x - 2, -37, 4, 5);
  }
  // Waistband
  c.fillStyle = shade(c, -33, -27, 220, 150);
  c.fillRect(14, -33, 36, 6);
  // Legs: widen hard toward the hem, which ripples
  const legHem = (x: number, ph: number) => 48 + breeze(x, ph);
  c.fillStyle = shade(c, -27, 50, 210, 85);
  c.beginPath();
  c.moveTo(14, -27);
  c.lineTo(31, -27);
  c.lineTo(30, -6); // crotch
  c.lineTo(30, 48);
  for (let x = 30; x >= 4; x -= 3) c.lineTo(x, legHem(x, 2));
  c.lineTo(5, 46);
  c.closePath();
  c.fill();
  c.beginPath();
  c.moveTo(33, -27);
  c.lineTo(50, -27);
  c.lineTo(59, 46);
  for (let x = 60; x >= 34; x -= 3) c.lineTo(x, legHem(x, 2.6));
  c.lineTo(34, -6);
  c.closePath();
  c.fill();
  // Pleats, cargo pocket and stacked hems
  c.strokeStyle = gray(70, 0.8);
  c.lineWidth = 1.2;
  for (const [x0, x1] of [
    [20, 14],
    [26, 22],
    [40, 44],
    [45, 52],
  ] as const) {
    c.beginPath();
    c.moveTo(x0, -24);
    c.quadraticCurveTo((x0 + x1) / 2 + breeze(x0, 3) * 0.5, 14, x1, 44);
    c.stroke();
  }
  c.strokeStyle = gray(240, 0.8);
  c.strokeRect(46, 6, 9, 11);
  c.strokeStyle = gray(60);
  for (let k = 0; k < 3; k++) {
    c.beginPath();
    c.moveTo(5, 40 + k * 3);
    c.quadraticCurveTo(17, 38 + k * 3 + breeze(k * 10, 2), 30, 40 + k * 3);
    c.moveTo(34, 40 + k * 3);
    c.quadraticCurveTo(47, 38 + k * 3 + breeze(k * 10, 2.6), 60, 40 + k * 3);
    c.stroke();
  }
  c.restore();
};

/* --------------------------------------------------------------- Pokémon */

const CARD_W = 60;
const CARD_H = 84;

const cardBack = (c: CanvasRenderingContext2D, level: number) => {
  c.fillStyle = shade(c, -CARD_H / 2, CARD_H / 2, 150 * level, 80 * level);
  rr(c, -CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 5);
  c.fill();
  c.strokeStyle = gray(235 * level);
  c.lineWidth = 2.5;
  rr(c, -CARD_W / 2 + 4, -CARD_H / 2 + 4, CARD_W - 8, CARD_H - 8, 3);
  c.stroke();
  // The ball: bright top, dark bottom, a band and a centre button.
  const r = 17;
  c.fillStyle = gray(245 * level);
  c.beginPath();
  c.arc(0, 0, r, Math.PI, TAU);
  c.fill();
  c.fillStyle = gray(45 * level);
  c.beginPath();
  c.arc(0, 0, r, 0, Math.PI);
  c.fill();
  c.fillStyle = gray(10);
  c.fillRect(-r, -2, r * 2, 4);
  c.beginPath();
  c.arc(0, 0, 7, 0, TAU);
  c.fill();
  c.fillStyle = gray(245 * level);
  c.beginPath();
  c.arc(0, 0, 4, 0, TAU);
  c.fill();
};

const cardFront = (c: CanvasRenderingContext2D, t: number) => {
  c.save();
  rr(c, -CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 5);
  c.clip();
  c.fillStyle = shade(c, -CARD_H / 2, CARD_H / 2, 250, 190);
  c.fillRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H);
  // Name bar and energy symbol.
  c.fillStyle = gray(40);
  c.fillRect(-24, -37, 28, 4);
  c.beginPath();
  c.arc(21, -35, 4.5, 0, TAU);
  c.fill();
  // Art window with a soft orb.
  c.fillStyle = shade(c, -29, 7, 30, 95);
  c.fillRect(-25, -29, 50, 36);
  c.fillStyle = radial(c, 0, -11, 13, 255, 120);
  c.beginPath();
  c.arc(0, -11, 13, 0, TAU);
  c.fill();
  // Attack lines.
  c.fillStyle = gray(45);
  for (const [y, w] of [
    [13, 42],
    [20, 34],
    [29, 42],
    [36, 24],
  ] as const) {
    c.fillRect(-25, y, w, 2.6);
  }
  // Holo shine sweeping across the card.
  const sweep = (((t * 0.55) % 1) - 0.5) * 150;
  c.fillStyle = gray(255, 0.75);
  c.beginPath();
  c.moveTo(sweep - 8, -46);
  c.lineTo(sweep + 8, -46);
  c.lineTo(sweep - 22, 46);
  c.lineTo(sweep - 38, 46);
  c.closePath();
  c.fill();
  c.restore();
  c.strokeStyle = gray(120);
  c.lineWidth = 1.6;
  rr(c, -CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 5);
  c.stroke();
};

const pokemon: SceneFn = (c, t) => {
  glow(c, 0, 46, 72, 40);

  // A fan of sleeved cards behind the one being turned over.
  for (const [x, y, angle, level] of [
    [-44, 6, -0.3, 0.55],
    [44, 6, 0.3, 0.55],
    [-26, 2, -0.16, 0.8],
    [26, 2, 0.16, 0.8],
  ] as const) {
    c.save();
    c.translate(x, y);
    c.rotate(angle);
    c.scale(0.86, 0.86);
    cardBack(c, level);
    c.restore();
  }

  // Lingers on each face, then turns over quickly.
  const turn = t * 0.8 + Math.sin(t * 1.6) * 0.42;
  const facing = Math.cos(turn);
  c.save();
  c.translate(0, -2);
  c.scale(Math.max(0.05, Math.abs(facing)), 1);
  if (facing > 0) cardFront(c, t);
  else cardBack(c, 1);
  c.restore();
};

export const GLYPHS: Record<Region, SceneFn> = {
  bouldering,
  djing,
  gaming,
  dogs,
  tech,
  streetwear,
  pokemon,
};

/** Callout size in CSS px. */
export const GLYPH_W = 150;
export const GLYPH_H = 112;

import type { Diagram, DiagramNode, NodeKind, Step, Vec3 } from "./data.ts";

/** Dots in the travelling packet, head first. */
export const TRAIL = 16;

export interface Slots {
  readonly wall: number;
  readonly floor: number;
  /** First of the `TRAIL` packet slots. */
  readonly trail: number;
  readonly count: number;
}

export const slotsFor = (d: Diagram): Slots => {
  const wall = d.nodes.length + d.edges.length;
  return { wall, floor: wall + 1, trail: wall + 2, count: wall + 2 + TRAIL };
};

export interface Cloud {
  readonly positions: Float32Array;
  readonly owners: Float32Array;
  readonly seeds: Float32Array;
  readonly scatter: Float32Array;
}

type Emit = (p: Vec3) => void;

const line = (a: Vec3, b: Vec3, spacing: number, emit: Emit) => {
  const n = Math.max(
    2,
    Math.round(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / spacing),
  );
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    emit([
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t,
    ]);
  }
};

const box = (c: Vec3, hx: number, hy: number, hz: number, emit: Emit) => {
  const p = (sx: number, sy: number, sz: number): Vec3 => [
    c[0] + sx * hx,
    c[1] + sy * hy,
    c[2] + sz * hz,
  ];
  const spacing = 0.045;
  for (const s of [-1, 1]) {
    for (const u of [-1, 1]) {
      line(p(-1, s, u), p(1, s, u), spacing, emit);
      line(p(s, -1, u), p(s, 1, u), spacing, emit);
      line(p(s, u, -1), p(s, u, 1), spacing, emit);
    }
  }
};

const sphere = (c: Vec3, r: number, n: number, emit: Emit) => {
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n;
    const ring = Math.sqrt(1 - y * y);
    const a = i * golden;
    emit([
      c[0] + Math.cos(a) * ring * r,
      c[1] + y * r,
      c[2] + Math.sin(a) * ring * r,
    ]);
  }
};

const cylinder = (c: Vec3, r: number, h: number, emit: Emit) => {
  const rings = 5;
  for (let j = 0; j < rings; j++) {
    const y = c[1] - h + (2 * h * j) / (rings - 1);
    const dots = j === 0 || j === rings - 1 ? 44 : 24;
    for (let i = 0; i < dots; i++) {
      const a = (i / dots) * Math.PI * 2;
      emit([c[0] + Math.cos(a) * r, y, c[2] + Math.sin(a) * r]);
    }
  }
};

const octahedron = (c: Vec3, r: number, emit: Emit) => {
  const tips: ReadonlyArray<Vec3> = [
    [c[0] + r, c[1], c[2]],
    [c[0], c[1], c[2] + r],
    [c[0] - r, c[1], c[2]],
    [c[0], c[1], c[2] - r],
  ];
  const top: Vec3 = [c[0], c[1] + r, c[2]];
  const bottom: Vec3 = [c[0], c[1] - r, c[2]];
  tips.forEach((tip, i) => {
    line(tip, tips[(i + 1) % tips.length] ?? tip, 0.05, emit);
    line(tip, top, 0.05, emit);
    line(tip, bottom, 0.05, emit);
  });
};

const SHAPES: Record<NodeKind, (c: Vec3, emit: Emit) => void> = {
  client: (c, emit) => box(c, 0.56, 0.33, 0.06, emit),
  service: (c, emit) => box(c, 0.46, 0.34, 0.38, emit),
  object: (c, emit) => sphere(c, 0.4, 340, emit),
  store: (c, emit) => cylinder(c, 0.36, 0.25, emit),
  external: (c, emit) => octahedron(c, 0.4, emit),
  sandbox: (c, emit) => {
    box(c, 0.48, 0.38, 0.42, emit);
    sphere(c, 0.2, 120, emit);
  },
};

/** Half-size of a node on screen, used to trim edges and place labels. */
export const NODE_RADIUS = 0.5;

export const nodeOf = (d: Diagram, id: string): DiagramNode => {
  const node = d.nodes.find((n) => n.id === id);
  if (!node) throw new Error(`Unknown diagram node: ${id}`);
  return node;
};

export const extent = (d: Diagram): { x: number; y: number } => ({
  x: Math.max(...d.nodes.map((n) => Math.abs(n.at[0]))) + 0.75,
  y: Math.max(...d.nodes.map((n) => Math.abs(n.at[1]))) + 0.75,
});

/** Every static dot in the scene, tagged with the slot that lights it. */
export const buildCloud = (d: Diagram): Cloud => {
  const slots = slotsFor(d);
  const pos: number[] = [];
  const own: number[] = [];
  const emitFor =
    (slot: number): Emit =>
    (p) => {
      pos.push(p[0], p[1], p[2]);
      own.push(slot);
    };

  d.nodes.forEach((n, i) => {
    SHAPES[n.kind](n.at, emitFor(i));
  });

  d.edges.forEach(([from, to], i) => {
    const a = nodeOf(d, from).at;
    const b = nodeOf(d, to).at;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const trim = Math.min(NODE_RADIUS / len, 0.45);
    const at = (t: number): Vec3 => [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t,
    ];
    line(at(trim), at(1 - trim), 0.075, emitFor(d.nodes.length + i));
  });

  const { x, y } = extent(d);
  const wall = emitFor(slots.wall);
  for (let wy = -y + 0.1; wy <= y; wy += 0.14) {
    for (let wz = -1.5; wz <= 1.5; wz += 0.14) {
      wall([d.boundary.x, wy, wz]);
    }
  }
  const floor = emitFor(slots.floor);
  for (let fx = -x; fx <= x; fx += 0.28) {
    for (let fz = -1.5; fz <= 1.5; fz += 0.28) {
      floor([fx, -y, fz]);
    }
  }

  const count = own.length;
  const seeds = new Float32Array(count);
  const scatter = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const s = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
    seeds[i] = s;
    const a = s * Math.PI * 2;
    const b = (Math.abs(Math.sin(i * 78.233) * 12543.1) % 1) * Math.PI;
    const r = 7 + s * 3;
    scatter[i * 3] = Math.sin(b) * Math.cos(a) * r;
    scatter[i * 3 + 1] = Math.cos(b) * r;
    scatter[i * 3 + 2] = Math.sin(b) * Math.sin(a) * r;
  }
  return {
    positions: new Float32Array(pos),
    owners: new Float32Array(own),
    seeds,
    scatter,
  };
};

/** How far along its line a blocked request gets: the wall, if it meets one. */
export const stopAt = (d: Diagram, step: Step): number => {
  if (!step.blocked) return 1;
  const a = nodeOf(d, step.from).at[0];
  const b = nodeOf(d, step.to).at[0];
  const wall = d.boundary.x;
  return (a - wall) * (b - wall) < 0 ? (wall - a) / (b - a) : 0.62;
};

export interface LevelView {
  readonly selected: string | null;
  readonly hovered: string | null;
  readonly step: Step | null;
  readonly visited: ReadonlyArray<Step>;
}

const touches = ([from, to]: readonly [string, string], step: Step): boolean =>
  (from === step.from && to === step.to) ||
  (from === step.to && to === step.from);

/** Target brightness (0 to 1) for each node, then each edge, then the wall. */
export const targetLevels = (d: Diagram, v: LevelView): number[] => {
  const crossesWall =
    v.step?.blocked === true && stopAt(d, v.step) !== 0.62 ? 1 : 0.32;

  if (v.step) {
    const step = v.step;
    const visited = new Set(v.visited.flatMap((s) => [s.from, s.to]));
    return [
      ...d.nodes.map((n) =>
        n.id === step.from || n.id === step.to
          ? 1
          : visited.has(n.id)
            ? 0.5
            : 0.14,
      ),
      ...d.edges.map((e) =>
        touches(e, step)
          ? 1
          : v.visited.some((s) => touches(e, s))
            ? 0.42
            : 0.05,
      ),
      crossesWall,
    ];
  }

  const focus = v.hovered ?? v.selected;
  const near = new Set(
    d.edges.flatMap(([a, b]) => (a === focus ? [b] : b === focus ? [a] : [])),
  );
  return [
    ...d.nodes.map((n) =>
      n.id === focus
        ? 1
        : near.has(n.id)
          ? 0.62
          : n.id === v.selected
            ? 0.7
            : 0.3,
    ),
    ...d.edges.map(([a, b]) => (a === focus || b === focus ? 0.82 : 0.12)),
    crossesWall,
  ];
};

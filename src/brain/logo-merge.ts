import {
  BufferAttribute,
  BufferGeometry,
  Group,
  LinearSRGBColorSpace,
  NormalBlending,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from "three";
import { LOGOS } from "./logos.ts";

export interface LogoMerge {
  dispose(): void;
}

export interface LogoMergeOptions {
  readonly host: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly word: string;
  readonly reduced: boolean;
  readonly onReady: () => void;
}

const LOGO_X = [-1.42, 0, 1.42];
const LOGO_SIZE = 1.05;
const CELLS_ACROSS = 46;
const WORD_WIDTH = 3.5;
const HALF_HEIGHT = 1.02;
const CAMERA_Z = 6;
const INTRO = 1.4;
const LOOP = 11;

const smooth = (from: number, to: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

/** How far the logos have gathered and the dots have formed the word. */
export const phaseAt = (seconds: number) => {
  const t = seconds < INTRO ? 0 : (seconds - INTRO) % LOOP;
  const gather = smooth(1.6, 3.4, t) * (1 - smooth(8, 9.8, t));
  const merge = smooth(3, 4.8, t) * (1 - smooth(7.6, 9.4, t));
  return { gather, merge };
};

interface Dot {
  readonly x: number;
  readonly y: number;
}

/** Filled grid cells of a shape, as coordinates centred on the shape. */
const gridOf = (
  width: number,
  height: number,
  step: number,
  paint: (c: CanvasRenderingContext2D) => void,
): Dot[] => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const c = canvas.getContext("2d", { willReadFrequently: true });
  if (!c) return [];
  c.fillStyle = "#fff";
  paint(c);
  const px = c.getImageData(0, 0, width, height).data;
  const dots: Dot[] = [];
  for (let y = step / 2; y < height; y += step) {
    for (let x = step / 2; x < width; x += step) {
      const a = px[(Math.floor(y) * width + Math.floor(x)) * 4 + 3] ?? 0;
      if (a > 110) dots.push({ x: x - width / 2, y: height / 2 - y });
    }
  }
  return dots;
};

const logoDots = (path: string) => {
  const size = 240;
  return gridOf(size, size, size / CELLS_ACROSS, (c) => {
    c.scale(size / 24, size / 24);
    c.fill(new Path2D(path));
  }).map((d) => ({
    x: (d.x / size) * LOGO_SIZE,
    y: (d.y / size) * LOGO_SIZE,
  }));
};

/** Dots spelling `word`, thinned or repeated to exactly `count` of them. */
const wordDots = (word: string, count: number) => {
  const width = 1000;
  const height = 300;
  const font = (px: number) =>
    `600 ${px}px "Helvetica Now Display", "Inter Tight", "Helvetica Neue", Arial, sans-serif`;
  const probe = document.createElement("canvas").getContext("2d");
  if (!probe) return [];
  probe.font = font(200);
  const px = Math.min(
    200,
    (200 * width * 0.96) / probe.measureText(word).width,
  );
  const paint = (c: CanvasRenderingContext2D) => {
    c.font = font(px);
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(word, width / 2, height / 2);
  };
  const dense = gridOf(width, height, 2, paint);
  // Never more cells than dots, or whole columns of the word would be skipped.
  let step = Math.max(2, Math.sqrt((dense.length * 4) / count));
  let cells = gridOf(width, height, step, paint);
  while (cells.length > count) {
    step *= 1.015;
    cells = gridOf(width, height, step, paint);
  }
  const dots = cells
    .map((d) => ({
      x: (d.x / width) * WORD_WIDTH,
      y: (d.y / width) * WORD_WIDTH,
    }))
    .sort((a, b) => a.x - b.x || a.y - b.y);
  return Array.from(
    { length: count },
    (_, i) => dots[Math.floor((i * dots.length) / count)] ?? { x: 0, y: 0 },
  );
};

const vertex = /* glsl */ `
  attribute vec3 aLocal;
  attribute vec3 aCenter;
  attribute float aSeed;
  uniform float uIntro;
  uniform float uGather;
  uniform float uMerge;
  uniform float uRock;
  uniform float uDot;
  varying float vAlpha;

  void main() {
    float angle = uRock * (1.0 - uGather);
    vec3 local = vec3(
      aLocal.x * cos(angle) + aLocal.z * sin(angle),
      aLocal.y,
      -aLocal.x * sin(angle) + aLocal.z * cos(angle)
    );

    // The logos swing in along a shallow arc as they gather.
    float swing = uGather * 1.5;
    vec3 centre = vec3(
      aCenter.x * cos(swing),
      aCenter.y,
      -aCenter.x * sin(swing)
    ) * (1.0 - uGather);
    vec3 logo = centre + local * (1.0 - 0.25 * uGather);

    float m = clamp(uMerge * 1.7 - aSeed * 0.7, 0.0, 1.0);
    m = m * m * (3.0 - 2.0 * m);
    float flight = sin(m * 3.14159);
    vec3 p = mix(logo, position, m);
    p.z += flight * (0.5 - aSeed);
    p.y += flight * (aSeed - 0.5) * 0.5;

    float arrive = clamp(uIntro * 1.6 - aSeed * 0.6, 0.0, 1.0);
    arrive = 1.0 - pow(1.0 - arrive, 3.0);
    vec3 scatter = normalize(vec3(sin(aSeed * 91.7), cos(aSeed * 47.3), sin(aSeed * 23.1)) + 0.001) * 5.0;
    p = mix(scatter, p, arrive);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float depth = clamp((mv.z + ${CAMERA_Z.toFixed(1)} + 1.5) / 3.0, 0.0, 1.0);
    vAlpha = (0.62 + 0.38 * depth + flight * 0.3) * (0.2 + 0.8 * arrive);
    gl_PointSize = uDot * (0.85 + 0.3 * depth);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragment = /* glsl */ `
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(236.0 / 255.0, 229.0 / 255.0, 225.0 / 255.0, vAlpha);
  }
`;

/** Three logos made of dots gather and rearrange into the project's name. */
export const createLogoMerge = (opts: LogoMergeOptions): LogoMerge | null => {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas: opts.canvas,
      antialias: false,
      alpha: true,
      powerPreference: "low-power",
    });
  } catch {
    return null;
  }
  renderer.outputColorSpace = LinearSRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const logos = LOGOS.map(logoDots);
  const count = logos.reduce((n, l) => n + l.length, 0);
  const word = wordDots(opts.word, count);

  const position = new Float32Array(count * 3);
  const local = new Float32Array(count * 3);
  const center = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  let i = 0;
  logos.forEach((dots, l) => {
    // Sorted left to right, so each logo flows into its part of the word.
    for (const d of [...dots].sort((a, b) => a.x - b.x || a.y - b.y)) {
      const target = word[i] ?? { x: 0, y: 0 };
      position.set([target.x, target.y, 0], i * 3);
      local.set([d.x, d.y, 0], i * 3);
      center.set([LOGO_X[l] ?? 0, 0, 0], i * 3);
      seed[i] = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
      i++;
    }
  });

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(position, 3));
  geometry.setAttribute("aLocal", new BufferAttribute(local, 3));
  geometry.setAttribute("aCenter", new BufferAttribute(center, 3));
  geometry.setAttribute("aSeed", new BufferAttribute(seed, 1));

  const uIntro = { value: opts.reduced ? 1 : 0 };
  const uGather = { value: 0 };
  const uMerge = { value: 0 };
  const uRock = { value: 0 };
  const uDot = { value: 2 };
  const material = new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: { uIntro, uGather, uMerge, uRock, uDot },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: NormalBlending,
  });

  const group = new Group();
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  group.add(points);
  const scene = new Scene();
  scene.add(group);
  const camera = new PerspectiveCamera(30, 2, 0.1, 20);
  camera.position.z = CAMERA_Z;

  const draw = () => renderer.render(scene, camera);
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, opts.host.clientWidth);
    const h = Math.max(1, opts.host.clientHeight);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const half = Math.max(HALF_HEIGHT, 2.2 / camera.aspect);
    camera.fov = (2 * Math.atan(half / CAMERA_Z) * 180) / Math.PI;
    camera.updateProjectionMatrix();
    const pxPerUnit = h / (2 * half);
    uDot.value = Math.max(
      1,
      (pxPerUnit * LOGO_SIZE * 0.66 * dpr) / CELLS_ACROSS,
    );
    if (opts.reduced) draw();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(opts.host);

  let lookX = 0;
  let lookY = 0;
  const onMove = (e: PointerEvent) => {
    const r = opts.host.getBoundingClientRect();
    lookX = ((e.clientX - r.left) / r.width) * 2 - 1;
    lookY = ((e.clientY - r.top) / r.height) * 2 - 1;
  };
  const onLeave = () => {
    lookX = 0;
    lookY = 0;
  };
  opts.host.addEventListener("pointermove", onMove);
  opts.host.addEventListener("pointerleave", onLeave);

  let raf = 0;
  const born = performance.now();
  const frame = (now: number) => {
    const t = (now - born) / 1000;
    uIntro.value = Math.min(1, t / INTRO);
    const { gather, merge } = phaseAt(t);
    uGather.value = gather;
    uMerge.value = merge;
    uRock.value = Math.sin(t * 0.9) * 0.42;
    group.rotation.y += (lookX * 0.32 - group.rotation.y) * 0.07;
    group.rotation.x += (lookY * 0.2 - group.rotation.x) * 0.07;
    draw();
    raf = requestAnimationFrame(frame);
  };

  if (opts.reduced) draw();
  else raf = requestAnimationFrame(frame);
  opts.onReady();

  return {
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      opts.host.removeEventListener("pointermove", onMove);
      opts.host.removeEventListener("pointerleave", onLeave);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
};

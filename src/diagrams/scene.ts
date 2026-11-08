import {
  BufferAttribute,
  BufferGeometry,
  DynamicDrawUsage,
  Group,
  LinearSRGBColorSpace,
  NormalBlending,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector3,
  WebGLRenderer,
} from "three";
import type { Diagram, Step, Vec3 } from "./data.ts";
import {
  buildCloud,
  extent,
  NODE_RADIUS,
  nodeOf,
  slotsFor,
  stopAt,
  TRAIL,
  targetLevels,
} from "./layout.ts";

export interface DiagramView {
  readonly selected: string | null;
  readonly step: Step | null;
  readonly visited: ReadonlyArray<Step>;
}

export interface DiagramScene {
  update(view: DiagramView): void;
  dispose(): void;
}

export interface DiagramOptions {
  readonly host: HTMLElement;
  readonly gl: HTMLCanvasElement;
  readonly labels: HTMLCanvasElement;
  readonly diagram: Diagram;
  readonly reduced: boolean;
  readonly view: DiagramView;
  readonly onHover: (id: string | null) => void;
  readonly onPick: (id: string) => void;
  /** Called once the first frame is on screen. */
  readonly onReady: () => void;
}

const CAMERA_Z = 13;
const REST_YAW = -0.26;
const REST_PITCH = 0.14;
const PITCH_LIMIT = 1.1;
const PACKET_MS = 950;
const COMPACT_WIDTH = 520;
const PICK_RADIUS = 46;

const hasWebGL = () => {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
};

export const createDiagramScene = (
  opts: DiagramOptions,
): DiagramScene | null => {
  if (!hasWebGL()) return null;

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas: opts.gl,
      antialias: false,
      alpha: true,
      powerPreference: "low-power",
    });
  } catch {
    return null;
  }
  renderer.outputColorSpace = LinearSRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const d = opts.diagram;
  const slots = slotsFor(d);

  const vertex = /* glsl */ `
    attribute float aOwner;
    attribute float aSeed;
    attribute vec3 aScatter;
    uniform float uLevel[${slots.count}];
    uniform float uAssemble;
    uniform float uPR;
    uniform float uScale;
    uniform float uTime;
    varying vec4 vColor;

    void main() {
      float lv = uLevel[int(aOwner + 0.5)];
      float local = clamp(uAssemble * 1.6 - aSeed * 0.6, 0.0, 1.0);
      local = 1.0 - pow(1.0 - local, 3.0);
      vec4 mv = modelViewMatrix * vec4(mix(aScatter, position, local), 1.0);
      float t = clamp((mv.z + ${CAMERA_Z.toFixed(1)} + 5.0) / 10.0, 0.0, 1.0);
      vec3 col = mix(vec3(122.0), vec3(236.0, 229.0, 225.0), lv) / 255.0;
      float a = (0.16 + 0.84 * lv) * (0.5 + 0.5 * t);
      a *= 0.9 + 0.1 * sin(uTime * 1.3 + aSeed * 40.0);
      a *= 0.25 + 0.75 * local;
      vColor = vec4(col, a);
      gl_PointSize = (1.5 + 1.6 * lv) * (0.75 + 0.5 * t) * uPR * uScale;
      gl_Position = projectionMatrix * mv;
    }
  `;
  const fragment = /* glsl */ `
    varying vec4 vColor;
    void main() { gl_FragColor = vColor; }
  `;

  const levels = new Array<number>(slots.count).fill(0);
  levels[slots.floor] = 0.12;
  for (let i = 0; i < TRAIL; i++) {
    levels[slots.trail + i] = 1 - i / TRAIL;
  }
  const uPR = { value: 1 };
  const uScale = { value: 1 };
  const uTime = { value: 0 };
  const uAssemble = { value: opts.reduced ? 1 : 0 };
  const material = new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: { uLevel: { value: levels }, uPR, uScale, uTime, uAssemble },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: NormalBlending,
  });

  const cloud = buildCloud(d);
  const staticGeo = new BufferGeometry();
  staticGeo.setAttribute("position", new BufferAttribute(cloud.positions, 3));
  staticGeo.setAttribute("aOwner", new BufferAttribute(cloud.owners, 1));
  staticGeo.setAttribute("aSeed", new BufferAttribute(cloud.seeds, 1));
  staticGeo.setAttribute("aScatter", new BufferAttribute(cloud.scatter, 3));

  const trailPos = new BufferAttribute(new Float32Array(TRAIL * 3), 3);
  trailPos.setUsage(DynamicDrawUsage);
  const packetGeo = new BufferGeometry();
  packetGeo.setAttribute("position", trailPos);
  packetGeo.setAttribute(
    "aOwner",
    new BufferAttribute(
      Float32Array.from({ length: TRAIL }, (_, i) => slots.trail + i),
      1,
    ),
  );
  packetGeo.setAttribute(
    "aSeed",
    new BufferAttribute(new Float32Array(TRAIL), 1),
  );
  packetGeo.setAttribute(
    "aScatter",
    new BufferAttribute(new Float32Array(TRAIL * 3), 3),
  );
  const packet = new Points(packetGeo, material);
  packet.frustumCulled = false;
  packet.visible = false;

  const group = new Group();
  group.add(new Points(staticGeo, material));
  group.add(packet);
  const scene = new Scene();
  scene.add(group);
  const camera = new PerspectiveCamera(30, 1, 0.1, 40);
  camera.position.set(0, 0, CAMERA_Z);

  const labels = opts.labels.getContext("2d");
  const fit = extent(d);

  /* ---- state ---- */
  let view = opts.view;
  let hovered: string | null = null;
  let stepBorn = 0;
  let yaw = REST_YAW;
  let pitch = REST_PITCH;
  let vyaw = 0;
  let vpitch = 0;
  let sway = opts.reduced ? 0 : 1;
  let drag: { x: number; y: number; moved: number } | null = null;

  /* ---- sizing ---- */
  let w = 1;
  let h = 1;
  let dpr = 1;
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(1, opts.host.clientWidth);
    h = Math.max(1, opts.host.clientHeight);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    opts.labels.width = Math.round(w * dpr);
    opts.labels.height = Math.round(h * dpr);
    camera.aspect = w / h;
    const half = Math.max(fit.y, fit.x / camera.aspect) * 1.02;
    camera.fov = (2 * Math.atan(half / CAMERA_Z) * 180) / Math.PI;
    camera.updateProjectionMatrix();
    uPR.value = dpr;
    uScale.value = Math.max(0.8, Math.min(1.5, Math.min(w, h) / 400));
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(opts.host);

  /* ---- projection ---- */
  const scratch = new Vector3();
  const toScreen = (p: Vec3, lift = 0) => {
    scratch.set(p[0], p[1] + lift, p[2]);
    scratch.applyMatrix4(group.matrixWorld).project(camera);
    return { x: (scratch.x * 0.5 + 0.5) * w, y: (-scratch.y * 0.5 + 0.5) * h };
  };

  /* ---- picking ---- */
  const local = (e: PointerEvent) => {
    const r = opts.host.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const pick = (x: number, y: number): string | null => {
    let best: string | null = null;
    let bd = PICK_RADIUS;
    for (const n of d.nodes) {
      const s = toScreen(n.at);
      const dist = Math.hypot(s.x - x, s.y - y);
      if (dist < bd) {
        bd = dist;
        best = n.id;
      }
    }
    return best;
  };
  const setHover = (id: string | null) => {
    if (id === hovered) return;
    hovered = id;
    opts.onHover(id);
    opts.host.style.cursor = drag ? "grabbing" : id ? "pointer" : "grab";
  };

  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const p = local(e);
    drag = { x: p.x, y: p.y, moved: 0 };
    sway = 0;
    opts.host.setPointerCapture(e.pointerId);
    opts.host.style.cursor = "grabbing";
  };
  const onMove = (e: PointerEvent) => {
    const p = local(e);
    if (!drag) {
      if (e.pointerType === "mouse") setHover(pick(p.x, p.y));
      return;
    }
    const dx = p.x - drag.x;
    const dy = p.y - drag.y;
    yaw += dx * 0.008;
    if (e.pointerType === "mouse") {
      pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch + dy * 0.008));
    }
    if (!opts.reduced) {
      vyaw = vyaw * 0.4 + dx * 0.008 * 0.6;
      vpitch = e.pointerType === "mouse" ? vpitch * 0.4 + dy * 0.0024 : 0;
    }
    drag.moved += Math.abs(dx) + Math.abs(dy);
    drag.x = p.x;
    drag.y = p.y;
  };
  const onUp = (e: PointerEvent) => {
    if (!drag) return;
    const moved = drag.moved;
    drag = null;
    opts.host.style.cursor = hovered ? "pointer" : "grab";
    if (moved < 6 && e.type === "pointerup") {
      const p = local(e);
      const id = pick(p.x, p.y);
      if (id) opts.onPick(id);
    }
  };
  const onLeave = () => setHover(null);

  opts.host.addEventListener("pointerdown", onDown);
  opts.host.addEventListener("pointermove", onMove);
  opts.host.addEventListener("pointerup", onUp);
  opts.host.addEventListener("pointercancel", onUp);
  opts.host.addEventListener("pointerleave", onLeave);
  opts.host.style.cursor = "grab";

  /* ---- labels ---- */
  const tag = (
    c: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    alpha: number,
  ) => {
    const width = c.measureText(text).width;
    c.fillStyle = `rgba(18,18,18,${(alpha * 0.74).toFixed(3)})`;
    c.fillRect(x - width / 2 - 4, y - 11, width + 8, 15);
    c.fillStyle = `rgba(236,229,225,${alpha.toFixed(3)})`;
    c.fillText(text, x, y);
  };

  const drawLabels = (step: Step | null, arrived: boolean) => {
    if (!labels) return;
    labels.setTransform(dpr, 0, 0, dpr, 0, 0);
    labels.clearRect(0, 0, w, h);
    labels.font = '10px "JetBrains Mono", ui-monospace, monospace';
    labels.textAlign = "center";
    const compact = w < COMPACT_WIDTH;
    d.nodes.forEach((n, i) => {
      const lv = levels[i] ?? 0;
      if (compact && lv < 0.5) return;
      const s = toScreen(n.at, NODE_RADIUS + 0.1);
      tag(labels, n.label.toUpperCase(), s.x, s.y, 0.42 + 0.58 * lv);
    });

    const foot = toScreen([d.boundary.x, -fit.y, 1.5]);
    labels.fillStyle = "rgba(138,138,138,0.95)";
    // Rotating past side-on swaps which half of the scene is on screen left.
    const flipped =
      toScreen([d.boundary.x - 1, 0, 0]).x >
      toScreen([d.boundary.x + 1, 0, 0]).x;
    const [onLeft, onRight] = flipped
      ? [d.boundary.right, d.boundary.left]
      : [d.boundary.left, d.boundary.right];
    labels.textAlign = "right";
    labels.fillText(onLeft.toUpperCase(), foot.x - 10, foot.y + 16);
    labels.textAlign = "left";
    labels.fillText(onRight.toUpperCase(), foot.x + 10, foot.y + 16);

    if (step?.blocked && arrived) {
      const a = nodeOf(d, step.from).at;
      const b = nodeOf(d, step.to).at;
      const t = stopAt(d, step);
      const s = toScreen([
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
      ]);
      labels.textAlign = "center";
      tag(labels, "× BLOCKED", s.x, s.y + 4, 1);
    }
  };

  /* ---- loop ---- */
  let raf = 0;
  let last = performance.now();
  let visible = true;
  let ready = false;
  const born = last;

  const placePacket = (step: Step, head: number) => {
    const a = nodeOf(d, step.from).at;
    const b = nodeOf(d, step.to).at;
    for (let i = 0; i < TRAIL; i++) {
      const t = Math.max(0, head - i * 0.016);
      trailPos.setXYZ(
        i,
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
      );
    }
    trailPos.needsUpdate = true;
  };

  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const k = dt * 60;

    if (!drag) {
      yaw += vyaw * k;
      vyaw *= 0.94 ** k;
      pitch += vpitch * k;
      vpitch *= 0.9 ** k;
      pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch));
    }
    const t = now / 1000;
    group.rotation.set(pitch, yaw + Math.sin(t * 0.35) * 0.16 * sway, 0, "XYZ");
    group.updateMatrixWorld();

    const targets = targetLevels(d, {
      selected: view.selected,
      hovered,
      step: view.step,
      visited: view.visited,
    });
    const e = opts.reduced ? 1 : 1 - Math.exp(-dt * 10);
    targets.forEach((target, i) => {
      levels[i] = (levels[i] ?? 0) + (target - (levels[i] ?? 0)) * e;
    });

    const step = view.step;
    const elapsed = now - stepBorn;
    const progress = opts.reduced ? 1 : Math.min(1, elapsed / PACKET_MS);
    if (step && !opts.reduced && elapsed < PACKET_MS + 350) {
      const eased = 1 - (1 - progress) ** 2;
      placePacket(step, eased * stopAt(d, step));
      packet.visible = true;
    } else {
      packet.visible = false;
    }

    uTime.value = t;
    uAssemble.value = opts.reduced ? 1 : Math.min(1, (now - born) / 1500);
    renderer.render(scene, camera);
    opts.labels.style.opacity = Math.min(
      1,
      Math.max(0, (uAssemble.value - 0.55) * 2.5),
    ).toFixed(3);
    drawLabels(step, progress >= 1);

    if (!ready) {
      ready = true;
      opts.onReady();
    }
    raf = visible ? requestAnimationFrame(frame) : 0;
  };

  const start = () => {
    if (raf || !visible || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };
  const io = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? true;
    visible ? start() : stop();
  });
  io.observe(opts.host);
  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener("visibilitychange", onVisibility);
  start();

  return {
    update(next) {
      if (next.step !== view.step) stepBorn = performance.now();
      view = next;
    },
    dispose() {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      opts.host.removeEventListener("pointerdown", onDown);
      opts.host.removeEventListener("pointermove", onMove);
      opts.host.removeEventListener("pointerup", onUp);
      opts.host.removeEventListener("pointercancel", onUp);
      opts.host.removeEventListener("pointerleave", onLeave);
      staticGeo.dispose();
      packetGeo.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
};

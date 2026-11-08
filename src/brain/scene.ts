import {
  BufferAttribute,
  BufferGeometry,
  Camera,
  Group,
  LinearSRGBColorSpace,
  Mesh,
  NormalBlending,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import {
  type Brain,
  buildBrain,
  drawLabels,
  facing,
  REGIONS,
  type Region,
  type ScreenAnchor,
} from "./points.ts";

export interface BrainScene {
  /** Select a region and swing the camera toward it. */
  focus(region: Region): void;
  dispose(): void;
}

export interface BrainOptions {
  readonly host: HTMLElement;
  readonly gl: HTMLCanvasElement;
  readonly labels: HTMLCanvasElement;
  readonly selected: Region;
  readonly onHover: (region: Region | null) => void;
  readonly onPick: (region: Region, clientX: number, clientY: number) => void;
  /** Music level 0–1, read every frame. */
  readonly beat?: () => number;
  /** Called once the first frame is on screen. */
  readonly onReady: () => void;
}

const IDLE_SPIN = 0.0035;
const REST_PITCH = -0.22;
const PITCH_LIMIT = 1.2;
const CAMERA_Z = 3.2;

const pointsVertex = /* glsl */ `
  attribute float aRegion;
  attribute float aSeed;
  attribute vec3 aScatter;
  uniform float uAssemble;
  uniform float uBeat;
  uniform float uSel[${REGIONS.length}];
  uniform float uHov[${REGIONS.length}];
  uniform float uPR;
  uniform float uScale;
  uniform float uTime;
  varying vec4 vColor;

  void main() {
    float labelled = step(-0.5, aRegion);
    float sel = 0.0;
    float hov = 0.0;
    for (int i = 0; i < ${REGIONS.length}; i++) {
      if (abs(aRegion - float(i)) < 0.5) {
        sel = uSel[i];
        hov = uHov[i];
      }
    }
    hov *= 1.0 - sel;

    // On load every dot flies in from a scattered cloud, staggered by seed.
    float seed = fract(abs(aSeed));
    float local = clamp(uAssemble * 1.6 - seed * 0.6, 0.0, 1.0);
    local = 1.0 - pow(1.0 - local, 3.0);
    vec3 home = mix(aScatter, position, local);

    // Selected regions breathe outward a touch; the DJing region (index 1)
    // also kicks with the music.
    float dj = 1.0 - step(0.5, abs(aRegion - 1.0));
    vec3 p = home * (1.0 + sel * 0.025 * (0.5 + 0.5 * sin(uTime * 2.4 + aSeed * 6.0)) + dj * uBeat * 0.06);
    sel = max(sel, dj * uBeat);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float t = clamp((mv.z + ${CAMERA_Z.toFixed(1)} + 1.3) / 2.6, 0.0, 1.0);

    vec3 base = mix(vec3(110.0), vec3(150.0, 148.0, 146.0), labelled) / 255.0;
    vec3 col = mix(mix(base, vec3(200.0, 194.0, 190.0) / 255.0, hov), vec3(236.0, 229.0, 225.0) / 255.0, sel);
    float a = mix(mix(mix(0.08 + 0.4 * t, 0.12 + 0.5 * t, labelled), 0.25 + 0.6 * t, hov), 0.35 + 0.65 * t, sel);
    float s = mix(mix(mix(0.7 + t, 0.8 + 1.1 * t, labelled), 1.0 + 1.3 * t, hov), 1.3 + 1.6 * t, sel);
    a *= 0.86 + 0.14 * sin(uTime * 1.3 + aSeed * 40.0);
    a *= 0.25 + 0.75 * local;

    vColor = vec4(col, a);
    gl_PointSize = s * uPR * uScale;
    gl_Position = projectionMatrix * mv;
  }
`;

const pointsFragment = /* glsl */ `
  varying vec4 vColor;
  void main() { gl_FragColor = vColor; }
`;

const postVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/** Background gradient + point layer + animated film grain + soft vignette. */
const postFragment = /* glsl */ `
  uniform sampler2D uTex;
  uniform vec2 uRes;
  uniform float uTime;
  uniform float uGrain;
  varying vec2 vUv;

  float hash(vec2 p) {
    p = fract(p * vec2(443.897, 441.423));
    p += dot(p, p.yx + 19.19);
    return fract((p.x + p.y) * p.x);
  }

  void main() {
    vec4 pts = texture2D(uTex, vUv);
    vec2 d = (vUv - vec2(0.5, 0.55)) / vec2(0.5, 0.55);
    float r = clamp(length(d) / 1.414 / 0.7, 0.0, 1.0);
    vec3 bg = mix(vec3(38.0), vec3(18.0), r) / 255.0;
    vec3 col = bg * (1.0 - pts.a) + pts.rgb;
    float frame = floor(uTime * 24.0);
    float n = hash(gl_FragCoord.xy + frame * vec2(37.0, 17.0)) - 0.5;
    col += n * uGrain;
    col *= 1.0 - 0.18 * smoothstep(0.55, 1.15, length(d));
    gl_FragColor = vec4(col, 1.0);
  }
`;

const hasWebGL = () => {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
};

export const createBrainScene = (opts: BrainOptions): BrainScene | null => {
  if (!hasWebGL()) return null;

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas: opts.gl,
      antialias: false,
      alpha: false,
      powerPreference: "low-power",
    });
  } catch {
    return null;
  }
  renderer.outputColorSpace = LinearSRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const brain: Brain = buildBrain(1);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(brain.positions, 3));
  geometry.setAttribute("aRegion", new BufferAttribute(brain.regions, 1));
  geometry.setAttribute("aSeed", new BufferAttribute(brain.seeds, 1));
  const scatter = new Float32Array(brain.positions.length);
  for (let i = 0; i < brain.seeds.length; i++) {
    const x = brain.positions[i * 3] ?? 0;
    const y = brain.positions[i * 3 + 1] ?? 0;
    const z = brain.positions[i * 3 + 2] ?? 0;
    const s = brain.seeds[i] ?? 0;
    const L = Math.hypot(x, y, z) || 1;
    const out = 2.4 + Math.abs(Math.sin(s * 91.7)) * 2.2;
    scatter[i * 3] = (x / L) * out + Math.sin(s * 13.1) * 0.6;
    scatter[i * 3 + 1] = (y / L) * out + Math.cos(s * 7.3) * 0.6;
    scatter[i * 3 + 2] = (z / L) * out;
  }
  geometry.setAttribute("aScatter", new BufferAttribute(scatter, 3));
  const uAssemble = { value: 0 };
  const uBeat = { value: 0 };

  const sel = REGIONS.map(() => 0);
  const hov = REGIONS.map(() => 0);
  const uPR = { value: 1 };
  const uScale = { value: 1 };
  const uTimePts = { value: 0 };
  const uTimePost = { value: 0 };
  const uRes = { value: new Vector2(1, 1) };
  const pointsMat = new ShaderMaterial({
    vertexShader: pointsVertex,
    fragmentShader: pointsFragment,
    uniforms: {
      uSel: { value: sel },
      uHov: { value: hov },
      uPR,
      uScale,
      uAssemble,
      uBeat,
      uTime: uTimePts,
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: NormalBlending,
  });

  const group = new Group();
  group.add(new Points(geometry, pointsMat));
  const scene = new Scene();
  scene.add(group);
  const camera = new PerspectiveCamera(50, 1, 0.1, 20);
  camera.position.set(0, 0, CAMERA_Z);

  const target = new WebGLRenderTarget(1, 1);
  const postGeo = new BufferGeometry();
  postGeo.setAttribute(
    "position",
    new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3),
  );
  const postMat = new ShaderMaterial({
    vertexShader: postVertex,
    fragmentShader: postFragment,
    uniforms: {
      uTex: { value: target.texture },
      uRes,
      uTime: uTimePost,
      uGrain: { value: 0.075 },
    },
    depthTest: false,
    depthWrite: false,
  });
  const post = new Mesh(postGeo, postMat);
  post.frustumCulled = false;
  const postScene = new Scene();
  postScene.add(post);
  const postCam = new Camera();

  const labels = opts.labels.getContext("2d");

  /* ---- motion state ---- */
  let yaw = 0.9;
  let pitch = REST_PITCH;
  let vyaw = 0.004;
  let vpitch = 0;
  let selected: Region = opts.selected;
  let hovered: Region | null = null;
  // Idle tilt toward the cursor anywhere on the page.
  let lookX = 0;
  let lookY = 0;
  let offYaw = 0;
  let offPitch = 0;
  const born = performance.now();
  let aim: { yaw: number; pitch: number; until: number } | null = null;
  let drag: { x: number; y: number; moved: number } | null = null;
  const levels = Object.fromEntries(
    REGIONS.map((r) => [r, r === selected ? 1 : 0]),
  ) as Record<Region, number>;
  const hoverLevels = Object.fromEntries(REGIONS.map((r) => [r, 0])) as Record<
    Region,
    number
  >;
  let screen: ScreenAnchor[] = [];

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
    target.setSize(Math.round(w * dpr), Math.round(h * dpr));
    opts.labels.width = Math.round(w * dpr);
    opts.labels.height = Math.round(h * dpr);
    // Match the prototype's framing: the brain spans ~66% of the short side.
    const half = (0.5 / 0.33) * Math.max(1, h / w);
    camera.fov = (2 * Math.atan(half / CAMERA_Z) * 180) / Math.PI;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    uPR.value = dpr;
    uScale.value = Math.max(0.8, Math.min(1.6, Math.min(w, h) / 380));
    uRes.value.set(w * dpr, h * dpr);
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(opts.host);

  /* ---- picking ---- */
  const local = (e: PointerEvent) => {
    const r = opts.host.getBoundingClientRect();
    return { x: (e.clientX - r.left) * dpr, y: (e.clientY - r.top) * dpr };
  };
  const pick = (x: number, y: number): Region | null => {
    let best: Region | null = null;
    let bd = Number.POSITIVE_INFINITY;
    for (const a of screen) {
      const d = Math.hypot(a.x - x, a.y - y);
      if (d < bd) {
        bd = d;
        best = a.region;
      }
    }
    return bd < 80 * dpr ? best : null;
  };
  const setHover = (r: Region | null) => {
    if (r === hovered) return;
    hovered = r;
    opts.onHover(r);
    opts.host.style.cursor = drag ? "grabbing" : r ? "pointer" : "grab";
  };

  const focus = (region: Region) => {
    selected = region;
    const anchor = brain.anchors
      .filter((a) => a.region === region)
      // Of DJing's two anchors, swing to whichever is nearer.
      .map((a) => ({ a, f: facing(a.at, yaw) }))
      .sort((p, q) => Math.abs(p.f.yaw - yaw) - Math.abs(q.f.yaw - yaw))[0];
    if (anchor) aim = { ...anchor.f, until: performance.now() + 2600 };
  };

  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const p = local(e);
    drag = { x: p.x, y: p.y, moved: 0 };
    aim = null;
    opts.host.setPointerCapture(e.pointerId);
    opts.host.style.cursor = "grabbing";
  };
  const onMove = (e: PointerEvent) => {
    const p = local(e);
    if (!drag) {
      if (e.pointerType === "mouse") setHover(pick(p.x, p.y));
      return;
    }
    const dx = (p.x - drag.x) / dpr;
    const dy = (p.y - drag.y) / dpr;
    yaw += dx * 0.01;
    if (e.pointerType === "mouse")
      pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch + dy * 0.01));
    // Smooth the release velocity so a flick carries, a jitter doesn't.
    vyaw = vyaw * 0.4 + dx * 0.01 * 0.6;
    vpitch = e.pointerType === "mouse" ? vpitch * 0.4 + dy * 0.01 * 0.3 : 0;
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
      const r = pick(p.x, p.y);
      if (r) {
        focus(r);
        opts.onPick(r, e.clientX, e.clientY);
      }
    }
  };
  const onLeave = () => setHover(null);

  opts.host.addEventListener("pointerdown", onDown);
  opts.host.addEventListener("pointermove", onMove);
  opts.host.addEventListener("pointerup", onUp);
  opts.host.addEventListener("pointercancel", onUp);
  opts.host.addEventListener("pointerleave", onLeave);
  opts.host.style.cursor = "grab";

  /* ---- loop ---- */
  let raf = 0;
  let last = performance.now();
  let visible = true;
  let ready = false;

  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const k = dt * 60;

    if (drag) {
      // Position follows the pointer directly.
    } else if (aim) {
      const e = 1 - Math.exp(-dt * 4.5);
      yaw += (aim.yaw - yaw) * e;
      pitch += (aim.pitch - pitch) * e;
      vyaw = 0;
      vpitch = 0;
      if (now > aim.until) aim = null;
    } else {
      yaw += vyaw * k;
      vyaw += (IDLE_SPIN - vyaw) * (1 - 0.985 ** k);
      pitch += vpitch * k;
      vpitch *= 0.9 ** k;
      pitch += (REST_PITCH - pitch) * (1 - 0.99 ** k);
      pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch));
    }

    const e = 1 - Math.exp(-dt * 10);
    for (const r of REGIONS) {
      levels[r] += ((r === selected ? 1 : 0) - levels[r]) * e;
      const glow = r === hovered ? 1 : 0;
      hoverLevels[r] += (glow - hoverLevels[r]) * e;
    }
    REGIONS.forEach((r, i) => {
      sel[i] = levels[r];
      hov[i] = hoverLevels[r];
    });

    // Lean toward the cursor unless the user is driving.
    const le = 1 - Math.exp(-dt * 3);
    const follow = drag || aim ? 0 : 1;
    offYaw += (lookX * 0.35 * follow - offYaw) * le;
    offPitch += (lookY * 0.18 * follow - offPitch) * le;
    const ry = yaw + offYaw;
    const rp = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch + offPitch));

    uAssemble.value = Math.min(1, (now - born) / 1800);
    // Labels arrive once the dots have mostly landed.
    opts.labels.style.opacity = Math.min(
      1,
      Math.max(0, (uAssemble.value - 0.55) * 2.5),
    ).toFixed(3);
    uBeat.value = opts.beat?.() ?? 0;

    group.rotation.set(rp, ry, 0, "XYZ");
    const t = now / 1000;
    uTimePts.value = t;
    uTimePost.value = t;

    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(postScene, postCam);

    if (labels) {
      const lv = Object.fromEntries(
        REGIONS.map((r) => [r, Math.max(levels[r], hoverLevels[r] * 0.6)]),
      ) as Record<Region, number>;
      screen = drawLabels(
        labels,
        brain.anchors,
        ry,
        rp,
        w * dpr,
        h * dpr,
        dpr,
        lv,
        { time: t, sel: levels },
      );
    }

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
  const onVis = () => (document.hidden ? stop() : start());
  document.addEventListener("visibilitychange", onVis);
  start();

  const onLook = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    lookX = (e.clientX / window.innerWidth) * 2 - 1;
    lookY = (e.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener("pointermove", onLook, { passive: true });

  return {
    focus,
    dispose() {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointermove", onLook);
      opts.host.removeEventListener("pointerdown", onDown);
      opts.host.removeEventListener("pointermove", onMove);
      opts.host.removeEventListener("pointerup", onUp);
      opts.host.removeEventListener("pointercancel", onUp);
      opts.host.removeEventListener("pointerleave", onLeave);
      geometry.dispose();
      pointsMat.dispose();
      postGeo.dispose();
      postMat.dispose();
      target.dispose();
      renderer.dispose();
    },
  };
};

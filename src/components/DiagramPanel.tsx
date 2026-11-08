import { useEffect, useMemo, useRef, useState } from "react";
import { DIAGRAMS } from "../diagrams/data.ts";
import type { DiagramId } from "../diagrams/ids.ts";
import { nodeOf } from "../diagrams/layout.ts";
import type { DiagramScene, DiagramView } from "../diagrams/scene.ts";
import { cx } from "../lib/cx.ts";
import { useReducedMotion } from "../lib/hooks.ts";
import { Brackets, Grain } from "./ui.tsx";

const STEP_MS = 3600;

const chip =
  "min-h-9 border px-2.5 font-mono text-[11px] uppercase transition-colors duration-200";
const chipOff = "border-line-dark bg-transparent text-cream hover:border-cream";
const chipOn = "border-cream bg-cream text-ink";

/**
 * A log's interactive 3D diagram. The parts, flows and readout are plain DOM,
 * so they still work by keyboard and without WebGL; three.js loads lazily when
 * the panel nears the viewport.
 */
export const DiagramPanel = ({ id }: { id: DiagramId }) => {
  const d = DIAGRAMS[id];
  const host = useRef<HTMLDivElement>(null);
  const gl = useRef<HTMLCanvasElement>(null);
  const labels = useRef<HTMLCanvasElement>(null);
  const scene = useRef<DiagramScene | null>(null);
  const reduced = useReducedMotion();
  const [live, setLive] = useState(false);
  const [noWebGL, setNoWebGL] = useState(false);
  const [selected, setSelected] = useState(d.initial);
  const [hovered, setHovered] = useState<string | null>(null);
  const [flowId, setFlowId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const flow = d.flows.find((f) => f.id === flowId) ?? null;
  const step = flow?.steps[stepIndex] ?? null;
  const view = useMemo<DiagramView>(
    () => ({
      selected,
      step,
      visited: flow ? flow.steps.slice(0, stepIndex) : [],
    }),
    [selected, step, flow, stepIndex],
  );
  const latest = useRef(view);
  latest.current = view;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let cancelled = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        void import("../diagrams/scene.ts").then(({ createDiagramScene }) => {
          if (cancelled || !gl.current || !labels.current || !host.current)
            return;
          scene.current = createDiagramScene({
            host: host.current,
            gl: gl.current,
            labels: labels.current,
            diagram: d,
            reduced,
            view: latest.current,
            onHover: setHovered,
            onPick: (node) => {
              setFlowId(null);
              setPlaying(false);
              setSelected(node);
            },
            onReady: () => setLive(true),
          });
          if (!scene.current) setNoWebGL(true);
        });
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
      scene.current?.dispose();
      scene.current = null;
      setLive(false);
    };
  }, [d, reduced]);

  useEffect(() => {
    scene.current?.update(view);
  }, [view]);

  useEffect(() => {
    if (!playing || !flow) return;
    const timer = window.setTimeout(() => {
      if (stepIndex + 1 < flow.steps.length) setStepIndex(stepIndex + 1);
      else setPlaying(false);
    }, STEP_MS);
    return () => window.clearTimeout(timer);
  }, [playing, flow, stepIndex]);

  const play = (next: string) => {
    setFlowId(next);
    setStepIndex(0);
    setPlaying(!reduced);
  };
  const leaveFlow = () => {
    setFlowId(null);
    setPlaying(false);
  };
  const go = (dir: 1 | -1) => {
    if (!flow) return;
    setPlaying(false);
    setStepIndex(Math.max(0, Math.min(flow.steps.length - 1, stepIndex + dir)));
  };

  const node = nodeOf(d, hovered ?? selected);
  const neighbours = d.edges.flatMap(([a, b]) =>
    a === node.id ? [b] : b === node.id ? [a] : [],
  );

  return (
    <figure className="m-0 mb-12">
      <div className="relative">
        <Brackets className="-m-2 text-ink" />
        <div
          ref={host}
          hidden={noWebGL}
          className="group relative h-[400px] touch-pan-y overflow-hidden bg-[radial-gradient(ellipse_at_50%_45%,#262626_0%,#121212_70%)] select-none md:h-[440px]"
        >
          <canvas
            ref={gl}
            className={cx(
              "absolute inset-0 block size-full transition-opacity duration-700",
              live ? "opacity-100" : "opacity-0",
            )}
          />
          <canvas
            ref={labels}
            className="pointer-events-none absolute inset-0 block size-full"
          />
          <Grain className="opacity-35" />
        </div>
      </div>

      <div className="flex flex-col gap-4 bg-panel p-4 font-mono text-cream">
        <figcaption className="flex flex-col gap-1">
          <span className="text-[12px] uppercase">{d.title}</span>
          <span className="text-[11px] leading-[1.5] text-soft">
            {d.caption}
          </span>
        </figcaption>

        <div className="flex flex-wrap gap-1.5">
          {d.flows.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={f.id === flowId}
              onClick={() => play(f.id)}
              className={cx(chip, f.id === flowId ? chipOn : chipOff)}
            >
              ▶ {f.label}
            </button>
          ))}
        </div>

        <div
          aria-live="polite"
          className="min-h-[104px] border-line-dark border-t pt-3 text-[12px] leading-[1.6]"
        >
          {flow && step ? (
            <div className="flex flex-col gap-2">
              <span className="text-[11px] uppercase text-soft">
                {flow.label} · step {stepIndex + 1} of {flow.steps.length}
                {step.blocked ? " · blocked" : ""}
              </span>
              <span className="uppercase">
                {nodeOf(d, step.from).label} {step.blocked ? "×" : "→"}{" "}
                {nodeOf(d, step.to).label}
              </span>
              <span>{step.note}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <span className="text-[11px] uppercase text-soft">
                {node.tech}
              </span>
              <span className="uppercase">{node.label}</span>
              <span>{node.detail}</span>
            </div>
          )}
        </div>

        {flow ? (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={stepIndex === 0}
              onClick={() => go(-1)}
              className={cx(chip, chipOff, "disabled:opacity-40")}
            >
              ← Back
            </button>
            <button
              type="button"
              disabled={stepIndex === flow.steps.length - 1}
              onClick={() => go(1)}
              className={cx(chip, chipOff, "disabled:opacity-40")}
            >
              Next →
            </button>
            <button
              type="button"
              onClick={leaveFlow}
              className={cx(chip, chipOff)}
            >
              Exit flow
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <span className="text-[11px] uppercase text-soft">
              Connected to
            </span>
            <div className="flex flex-wrap gap-1.5">
              {neighbours.length > 0 ? (
                neighbours.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSelected(n)}
                    className={cx(chip, chipOff)}
                  >
                    {nodeOf(d, n).label}
                  </button>
                ))
              ) : (
                <span className="text-[11px] uppercase">Nothing</span>
              )}
            </div>
          </div>
        )}

        <details className="border-line-dark border-t pt-3">
          <summary className="cursor-pointer text-[11px] uppercase text-soft hover:text-cream">
            All parts
          </summary>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {d.nodes.map((n) => (
              <button
                key={n.id}
                type="button"
                aria-pressed={!flow && n.id === selected}
                onClick={() => {
                  leaveFlow();
                  setSelected(n.id);
                }}
                className={cx(
                  chip,
                  !flow && n.id === selected ? chipOn : chipOff,
                )}
              >
                {n.label}
              </button>
            ))}
          </div>
        </details>
      </div>
    </figure>
  );
};

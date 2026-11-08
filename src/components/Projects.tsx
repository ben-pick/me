import { type PointerEvent, useRef } from "react";
import { content, type Project } from "../content/index.ts";
import { cx } from "../lib/cx.ts";
import { actions, anchorFrom } from "../lib/store.ts";
import { Brackets, Chip, SectionHeader } from "./ui.tsx";

/** Card that tilts a few degrees toward the pointer and settles back on leave. */
const Card = ({ p }: { p: Project }) => {
  const ref = useRef<HTMLButtonElement>(null);
  const dark = p.featured === true;

  const onMove = (e: PointerEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${(-y * 4).toFixed(2)}deg) rotateY(${(x * 5).toFixed(2)}deg) translateY(-3px)`;
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = "";
  };

  return (
    <button
      ref={ref}
      type="button"
      aria-haspopup="dialog"
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onClick={(e) =>
        actions.openPopover(
          { kind: "project", slug: p.slug },
          { anchor: anchorFrom(e.currentTarget, e), trigger: e.currentTarget },
        )
      }
      className={cx(
        "group relative flex flex-col gap-3.5 border border-ink p-7 text-left font-mono transition-[transform,background-color,color] duration-500 ease-out-expo will-change-transform active:scale-[0.985] motion-reduce:transform-none",
        dark
          ? "bg-ink text-cream"
          : "bg-transparent text-ink hover:bg-ink hover:text-cream",
      )}
    >
      <Brackets className="-m-[5px] opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 text-ink" />
      <span className="flex justify-between text-[11px] uppercase">
        <span>{p.code}</span>
        <span>{p.status}</span>
      </span>
      <span className="font-display text-[30px] uppercase leading-[0.95] tracking-[-0.02em]">
        {p.name}
      </span>
      <span className="text-[12px] leading-[1.45]">{p.pitch}</span>
      <span className="mt-auto flex flex-wrap gap-1.5">
        {p.tags.map((t) => (
          <Chip key={t}>{t}</Chip>
        ))}
      </span>
      <span
        aria-hidden="true"
        className="absolute right-7 bottom-7 translate-y-1 text-[12px] opacity-0 transition-all duration-300 ease-out-expo group-hover:translate-y-0 group-hover:opacity-100"
      >
        Open ↗
      </span>
    </button>
  );
};

export const Projects = () => (
  <section aria-labelledby="projects" className="scroll-mt-6 flex flex-col">
    <SectionHeader
      id="projects"
      title="Projects"
      caption="Things I'm building"
    />
    <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3.5">
      {content.projects.map((p) => (
        <Card key={p.slug} p={p} />
      ))}
    </div>
  </section>
);

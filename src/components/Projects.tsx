import { type PointerEvent, useRef } from "react";
import { content, logsForProject, type Project } from "../content/index.ts";
import { cx } from "../lib/cx.ts";
import { actions, anchorFrom } from "../lib/store.ts";
import { formatDate } from "./Logs.tsx";
import { Brackets, Chip, SectionHeader } from "./ui.tsx";

/**
 * Card that tilts a touch toward the pointer and settles back on leave. A wide
 * card (the only project) also previews the latest build-log entries.
 */
const Card = ({ p, wide }: { p: Project; wide: boolean }) => {
  const ref = useRef<HTMLButtonElement>(null);
  const dark = p.featured === true;
  const logs = logsForProject(p.slug);

  const onMove = (e: PointerEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    const tilt = wide ? 0.4 : 1;
    el.style.transform = `perspective(1200px) rotateX(${(-y * 4 * tilt).toFixed(2)}deg) rotateY(${(x * 5 * tilt).toFixed(2)}deg) translateY(-3px)`;
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
        "group relative grid gap-8 border border-ink p-7 text-left font-mono transition-[transform,background-color,color] duration-500 ease-out-expo will-change-transform active:scale-[0.99] motion-reduce:transform-none",
        wide && "md:grid-cols-[1.15fr_1fr] md:gap-12 md:p-10",
        dark
          ? "bg-ink text-cream"
          : "bg-transparent text-ink hover:bg-ink hover:text-cream",
      )}
    >
      <Brackets className="-m-[5px] text-ink opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100" />
      <span className="flex flex-col gap-3.5">
        <span className="flex justify-between text-[11px] uppercase">
          <span>{p.code}</span>
          <span>{p.status}</span>
        </span>
        <span
          className={cx(
            "font-display uppercase leading-[0.9] tracking-[-0.02em]",
            wide ? "text-[clamp(48px,7vw,88px)]" : "text-[30px]",
          )}
        >
          {p.name}
        </span>
        <span
          className={cx(
            "leading-[1.45]",
            wide ? "max-w-[46ch] text-[13px]" : "text-[12px]",
          )}
        >
          {p.pitch}
        </span>
        <span className="mt-auto flex flex-wrap gap-1.5 pt-2">
          {p.tags.map((t) => (
            <Chip key={t}>{t}</Chip>
          ))}
        </span>
      </span>
      {wide && logs.length > 0 ? (
        <span className="flex flex-col">
          <span className="mb-1 flex justify-between text-[11px] uppercase opacity-60">
            <span>Build log</span>
            <span>{logs.length} entries</span>
          </span>
          {logs.slice(0, 4).map((l, i) => (
            <span
              key={l.slug}
              style={{ transitionDelay: `${i * 40}ms` }}
              className="grid grid-cols-[84px_1fr] gap-3 border-current/25 border-b py-2.5 text-[12px] transition-transform duration-500 ease-out-expo group-hover:translate-x-1"
            >
              <span className="uppercase opacity-60">{formatDate(l.date)}</span>
              <span className="uppercase">{l.title}</span>
            </span>
          ))}
          <span className="mt-4 self-end text-[12px] uppercase opacity-70 transition-[opacity,transform] duration-300 ease-out-expo group-hover:-translate-y-0.5 group-hover:opacity-100">
            Open project ↗
          </span>
        </span>
      ) : (
        <span
          aria-hidden="true"
          className="absolute right-7 bottom-7 translate-y-1 text-[12px] opacity-0 transition-all duration-300 ease-out-expo group-hover:translate-y-0 group-hover:opacity-100"
        >
          Open ↗
        </span>
      )}
    </button>
  );
};

export const Projects = () => {
  const wide = content.projects.length === 1;
  return (
    <section aria-labelledby="projects" className="scroll-mt-6 flex flex-col">
      <SectionHeader
        id="projects"
        title="Projects"
        caption="Things I'm building"
      />
      <div
        className={cx(
          "grid gap-3.5",
          !wide && "grid-cols-[repeat(auto-fit,minmax(260px,1fr))]",
        )}
      >
        {content.projects.map((p) => (
          <Card key={p.slug} p={p} wide={wide} />
        ))}
      </div>
    </section>
  );
};

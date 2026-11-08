import { type CSSProperties, useRef, useState } from "react";
import { content } from "../content/index.ts";
import { cx } from "../lib/cx.ts";
import { actions, anchorFrom } from "../lib/store.ts";
import { SectionHeader } from "./ui.tsx";

const COLS = "md:grid-cols-[50px_1fr_210px_190px]";

/**
 * Numbered index. A single ink block glides between rows on hover/focus, and
 * the active row's text inverts — so moving down the list feels continuous.
 */
export const CompanyIndex = () => {
  const list = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [box, setBox] = useState<{ top: number; height: number } | null>(null);

  const activate = (i: number, el: HTMLElement) => {
    setActive(i);
    setBox({ top: el.offsetTop, height: el.offsetHeight });
  };

  const highlight: CSSProperties = box
    ? { transform: `translateY(${box.top}px)`, height: box.height }
    : { height: 0 };

  return (
    <section aria-labelledby="experience" className="scroll-mt-6 flex flex-col">
      <SectionHeader
        id="experience"
        title="Companies"
        caption="Click a row for the full story"
      />
      <div
        className={cx(
          "hidden gap-4 border-ink border-b pb-2.5 text-[11px] uppercase text-muted md:grid",
          COLS,
        )}
      >
        <span>N°</span>
        <span>Company</span>
        <span>Role</span>
        <span className="text-right">Years</span>
      </div>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: pointer-leave only fades the hover highlight */}
      <div
        ref={list}
        className="relative"
        onPointerLeave={() => {
          setActive(null);
          actions.setPreview(null);
        }}
        onBlur={(e) => {
          if (!list.current?.contains(e.relatedTarget as Node | null))
            setActive(null);
        }}
      >
        <span
          aria-hidden="true"
          style={highlight}
          className={cx(
            "pointer-events-none absolute top-0 -right-4 -left-4 bg-ink transition-[transform,height,opacity] duration-[420ms] ease-out-expo motion-reduce:transition-none",
            active === null ? "opacity-0" : "opacity-100",
          )}
        />
        {content.companies.map((c, i) => {
          const on = active === i;
          return (
            <button
              key={c.slug}
              type="button"
              aria-haspopup="dialog"
              onPointerEnter={(e) => {
                activate(i, e.currentTarget);
                if (e.pointerType === "mouse") actions.setPreview(c.slug);
              }}
              onFocus={(e) => activate(i, e.currentTarget)}
              onClick={(e) => {
                actions.setPreview(null);
                actions.openPopover(
                  { kind: "company", slug: c.slug },
                  {
                    anchor: anchorFrom(e.currentTarget, e),
                    trigger: e.currentTarget,
                  },
                );
              }}
              className={cx(
                "relative grid w-full grid-cols-[32px_1fr] items-baseline gap-x-4 gap-y-2 border-0 border-ink border-b bg-transparent py-[22px] text-left font-mono transition-colors duration-300 focus-visible:outline-none",
                COLS,
                on ? "text-cream" : "text-ink",
              )}
            >
              <span className="text-[12px]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex min-w-0 flex-col gap-2">
                <span
                  className={cx(
                    "font-display text-[clamp(36px,5vw,52px)] uppercase leading-[0.9] tracking-[-0.02em] transition-transform duration-500 ease-out-expo",
                    on && "md:translate-x-2",
                  )}
                >
                  {c.name}
                </span>
                <span
                  className={cx(
                    "text-[11px] uppercase transition-colors duration-300",
                    on ? "text-[#b8b2ae]" : "text-muted",
                  )}
                >
                  {c.highlight}
                </span>
              </span>
              <span className="col-start-2 text-[12px] uppercase md:col-start-auto">
                {c.role}
              </span>
              <span className="col-start-2 flex items-baseline gap-1 whitespace-nowrap text-[12px] md:col-start-auto md:justify-end">
                {c.start} — {c.end}
                <span
                  aria-hidden="true"
                  className={cx(
                    "inline-block transition-transform duration-300 ease-out-expo",
                    on && "translate-x-0.5 -translate-y-0.5",
                  )}
                >
                  ↗
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

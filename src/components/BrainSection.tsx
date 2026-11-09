import { content, site } from "../content/index.ts";
import { cx } from "../lib/cx.ts";
import { actions, anchorFrom, useStore } from "../lib/store.ts";
import { BrainPanel } from "./BrainPanel.tsx";
import { SectionHeader } from "./ui.tsx";

/**
 * The brain with a list of its regions beside it. Hovering a row turns the
 * brain to that region and plays its callout; clicking opens it.
 */
export const BrainSection = () => {
  const selected = useStore((s) => s.interest);
  const hovered = useStore((s) => s.hoverInterest);
  return (
    <section
      data-tour="brain"
      aria-labelledby="brain"
      className="flex flex-col"
    >
      <SectionHeader
        id="brain"
        title={site.sections.brain.title}
        caption={site.sections.brain.caption}
      />
      <div className="grid items-start gap-8 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <BrainPanel />
        <ul
          className="m-0 flex list-none flex-col border-ink border-t p-0"
          onPointerLeave={() => actions.hoverInterest(null)}
        >
          {content.interests.map((i) => {
            const on = i.slug === (hovered ?? selected);
            return (
              <li key={i.slug} className="border-ink border-b">
                <button
                  type="button"
                  aria-haspopup="dialog"
                  onPointerEnter={(e) => {
                    if (e.pointerType === "mouse")
                      actions.hoverInterest(i.slug);
                  }}
                  onFocus={() => actions.setInterest(i.slug)}
                  onClick={(e) =>
                    actions.openPopover(
                      { kind: "interest", slug: i.slug },
                      {
                        anchor: anchorFrom(e.currentTarget, e),
                        trigger: e.currentTarget,
                      },
                    )
                  }
                  className={cx(
                    "group grid w-full grid-cols-[32px_1fr_auto] items-baseline gap-3 border-0 px-3 py-3.5 text-left font-mono transition-colors duration-300",
                    on ? "bg-ink text-cream" : "bg-transparent text-ink",
                  )}
                >
                  <span className="text-[12px]">{i.num}</span>
                  <span
                    className={cx(
                      "font-display text-[28px] uppercase leading-none tracking-[-0.02em] transition-transform duration-500 ease-out-expo",
                      on && "translate-x-1.5",
                    )}
                  >
                    {i.name}
                  </span>
                  <span
                    className={cx(
                      "text-right text-[11px] uppercase",
                      on ? "text-soft" : "text-muted",
                    )}
                  >
                    {i.region}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

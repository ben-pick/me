import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";
import { cx } from "../lib/cx.ts";
import { useInView } from "../lib/hooks.ts";
import { scramble } from "../lib/scramble.ts";

/** Four 12px L-shaped corners. Grows to 16px when an ancestor `group` is hovered. */
export const Brackets = ({ className }: { className?: string }) => {
  const base =
    "pointer-events-none absolute size-3 border-current transition-[width,height] duration-300 ease-out-expo group-hover:size-4 group-focus-visible:size-4";
  return (
    <span
      aria-hidden="true"
      className={cx("pointer-events-none absolute inset-0", className)}
    >
      <span className={cx(base, "top-0 left-0 border-t border-l")} />
      <span className={cx(base, "top-0 right-0 border-t border-r")} />
      <span className={cx(base, "bottom-0 left-0 border-b border-l")} />
      <span className={cx(base, "right-0 bottom-0 border-r border-b")} />
    </span>
  );
};

export const Chip = ({ children }: { children: ReactNode }) => (
  <span className="whitespace-nowrap border border-current px-1.5 py-0.5 text-[10px] uppercase leading-snug">
    {children}
  </span>
);

const GRAIN: CSSProperties = {
  backgroundImage:
    "repeating-radial-gradient(circle at 23% 41%, rgb(255 255 255 / .08) 0 1px, transparent 1px 2px), repeating-radial-gradient(circle at 71% 13%, rgb(0 0 0 / .22) 0 1px, transparent 1px 3px)",
};

/** Heavy film grain over dark media. */
export const Grain = ({ className }: { className?: string }) => (
  <span
    aria-hidden="true"
    style={GRAIN}
    className={cx(
      "pointer-events-none absolute inset-0 animate-grain motion-reduce:animate-none",
      className,
    )}
  />
);

export const PAPER: CSSProperties = {
  backgroundImage:
    "repeating-radial-gradient(circle at 40% 30%, rgb(0 0 0 / .035) 0 1px, transparent 1px 3px)",
};

/**
 * Heading + caption, with a hairline that runs to the right edge. When it
 * scrolls into view the heading scrambles into place and the rule draws across.
 */
export const SectionHeader = ({
  title,
  caption,
  id,
}: {
  title: string;
  caption?: ReactNode;
  id?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref);
  useEffect(() => {
    if (seen && text.current)
      return scramble(text.current, title.toUpperCase(), 520);
  }, [seen, title]);
  return (
    <div ref={ref} className="mb-[18px] flex items-baseline gap-4">
      <h2
        id={id}
        className="m-0 font-display text-[28px] uppercase leading-none tracking-[-0.02em]"
      >
        <span ref={text}>{title}</span>
      </h2>
      <span
        aria-hidden="true"
        className={cx(
          "h-px flex-1 translate-y-[-6px] origin-left bg-ink/70 transition-transform delay-150 duration-[1100ms] ease-out-expo motion-reduce:scale-x-100",
          seen ? "scale-x-100" : "scale-x-0",
        )}
      />
      {caption ? (
        <span
          className={cx(
            "text-[11px] uppercase text-muted transition-opacity delay-500 duration-500",
            seen ? "opacity-100" : "opacity-0 motion-reduce:opacity-100",
          )}
        >
          {caption}
        </span>
      ) : null}
    </div>
  );
};

export const Kbd = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <kbd
    className={cx(
      "inline-flex min-w-5 items-center justify-center border border-current px-1 font-mono text-[10px] leading-4 opacity-70",
      className,
    )}
  >
    {children}
  </kbd>
);

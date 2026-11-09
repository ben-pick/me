import {
  type PointerEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { site } from "../content/index.ts";
import { type Contributions, type Day, toWeeks } from "../lib/contributions.ts";
import { cx } from "../lib/cx.ts";
import { STATIC_BUILD } from "../lib/env.ts";
import { useInView } from "../lib/hooks.ts";

const USER = site.github.user;
/** Dot size and brightness for GitHub's 0–4 levels, as a share of the cell. */
const SIZE = [0.2, 0.42, 0.6, 0.78, 0.96];
/** Space kept between the tooltip and the panel's edge. */
const TIP_MARGIN = 8;
const ALPHA = [0.22, 0.55, 0.75, 0.9, 1];

type Status = "loading" | "ready" | "offline";

/** A year of empty days, so the grid has its shape before data arrives. */
const blankYear = (): Day[] => {
  const end = new Date();
  return Array.from({ length: 371 }, (_, i) => {
    const d = new Date(end);
    d.setUTCDate(end.getUTCDate() - (370 - i));
    return { date: d.toISOString().slice(0, 10), count: 0, level: 0 };
  });
};

const fmt = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

const useContributions = (enabled: boolean) => {
  const [data, setData] = useState<Contributions | null>(null);
  const [status, setStatus] = useState<Status>(
    STATIC_BUILD ? "offline" : "loading",
  );
  useEffect(() => {
    if (!enabled || STATIC_BUILD) return;
    let cancelled = false;
    fetch("/api/contributions")
      .then((r) =>
        r.ok
          ? (r.json() as Promise<Contributions>)
          : Promise.reject(new Error(String(r.status))),
      )
      .then((d) => {
        if (cancelled) return;
        if (d.days.length === 0) throw new Error("empty");
        setData(d);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("offline");
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return { data, status };
};

/**
 * GitHub contributions for the last year as a halftone grid: busier days get
 * bigger, brighter dots. Columns fill in week by week as it scrolls into view.
 */
export const ContributionGraph = () => {
  const ref = useRef<HTMLElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, "0px 0px -10% 0px");
  const { data, status } = useContributions(seen);
  const days = useMemo(() => data?.days ?? blankYear(), [data]);
  const weeks = useMemo(() => toWeeks(days).slice(-53), [days]);
  const tip = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ day: Day; x: number; y: number } | null>(
    null,
  );

  // On narrow screens the grid scrolls; start at the most recent weeks.
  const columns = weeks.length;
  useEffect(() => {
    const el = scroller.current;
    if (el && columns) el.scrollLeft = el.scrollWidth;
  }, [columns]);

  const months = weeks.map((w, i) => {
    const first = w.find((d) => d !== null);
    if (!first) return null;
    const date = new Date(`${first.date}T00:00:00Z`);
    return date.getUTCDate() <= 7 && i > 0
      ? date.toLocaleDateString("en-AU", { month: "short", timeZone: "UTC" })
      : null;
  });

  const busiest = data?.days.reduce<Day | null>(
    (m, d) => (!m || d.count > m.count ? d : m),
    null,
  );

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const cell =
      e.target instanceof HTMLElement
        ? e.target.closest<HTMLElement>("[data-date]")
        : null;
    const box = ref.current?.getBoundingClientRect();
    if (!cell || !box || !data) {
      setHover(null);
      return;
    }
    const day = data.days.find((d) => d.date === cell.dataset.date);
    const r = cell.getBoundingClientRect();
    if (day)
      setHover({ day, x: r.left + r.width / 2 - box.left, y: r.top - box.top });
  };

  // Centred on the day, but slid inward at the panel's edges so it never clips.
  useLayoutEffect(() => {
    const el = tip.current;
    const box = ref.current;
    if (!el || !box || !hover) return;
    const half = el.offsetWidth / 2;
    const left = Math.max(half + TIP_MARGIN, hover.x);
    el.style.left = `${Math.min(box.clientWidth - half - TIP_MARGIN, left)}px`;
  }, [hover]);

  return (
    <section
      ref={ref}
      aria-labelledby="activity"
      className="relative flex min-w-0 flex-col overflow-hidden bg-ink p-6 text-cream md:p-7"
    >
      <div className="relative mb-4 flex justify-between gap-3 text-[11px] uppercase text-soft">
        <h2 id="activity" className="m-0 font-mono text-[11px] font-normal">
          {site.sections.activity.title}
        </h2>
        <a
          href={`https://github.com/${USER}`}
          target="_blank"
          rel="noreferrer"
          className="text-soft no-underline hover:text-cream"
        >
          github.com/{USER} ↗
        </a>
      </div>
      <div className="relative mb-5 flex flex-wrap items-baseline justify-between gap-3 text-[11px] uppercase">
        <span className="flex items-baseline gap-3">
          {status === "ready" && data ? (
            <>
              <span className="font-display text-[40px] leading-none tracking-[-0.02em]">
                {data.total.toLocaleString("en-AU")}
              </span>
              <span className="text-soft">contributions in the last year</span>
            </>
          ) : (
            <span className="text-soft">
              {status === "loading"
                ? "Reading GitHub…"
                : "Live on the deployed site"}
            </span>
          )}
        </span>
        <span className="flex items-center gap-2 text-soft" aria-hidden="true">
          Less
          {SIZE.map((s, i) => (
            <span key={s} className="grid size-[11px] place-items-center">
              <span
                className="block bg-cream"
                style={{
                  width: `${s * 100}%`,
                  height: `${s * 100}%`,
                  opacity: ALPHA[i],
                }}
              />
            </span>
          ))}
          More
        </span>
      </div>
      <p className="sr-only">
        {status === "ready" && data
          ? `${data.total} GitHub contributions in the last year${busiest && busiest.count > 0 ? `; busiest day ${fmt(busiest.date)} with ${busiest.count}.` : "."}`
          : "GitHub contribution graph."}
      </p>
      <div
        ref={scroller}
        className="relative overflow-x-auto pb-1 [scrollbar-width:thin]"
      >
        <div className="min-w-[520px]">
          <div
            aria-hidden="true"
            className="mb-1.5 grid grid-cols-[repeat(53,minmax(0,1fr))] text-[10px] uppercase text-soft"
          >
            {months.map((m, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: one label slot per week column
              <span key={i} className="overflow-visible whitespace-nowrap">
                {m}
              </span>
            ))}
          </div>
          <div
            aria-hidden="true"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
            className="grid grid-flow-col grid-cols-[repeat(53,minmax(0,1fr))] grid-rows-7 gap-[3px]"
          >
            {weeks.flatMap((w, wi) =>
              Array.from({ length: 7 }, (_, di) => {
                const d = w[di] ?? null;
                const level = d?.level ?? 0;
                const on = seen && (status !== "loading" || level === 0);
                return (
                  <span
                    key={d?.date ?? `pad-${String(wi)}-${String(di)}`}
                    data-date={d?.date}
                    className={cx(
                      "relative grid aspect-square place-items-center",
                      d && data && "cursor-pointer",
                      hover?.day.date === d?.date &&
                        d &&
                        "outline outline-1 outline-cream/70",
                    )}
                  >
                    {d ? (
                      <span
                        className="pointer-events-none block bg-cream transition-[transform,opacity] duration-500 ease-out-expo motion-reduce:transition-none"
                        style={{
                          width: `${(SIZE[level] ?? 0.2) * 100}%`,
                          height: `${(SIZE[level] ?? 0.2) * 100}%`,
                          opacity: on ? ALPHA[level] : 0,
                          transform: on ? "scale(1)" : "scale(0)",
                          transitionDelay: `${wi * 12 + di * 8}ms`,
                        }}
                      />
                    ) : null}
                  </span>
                );
              }),
            )}
          </div>
        </div>
      </div>
      {hover ? (
        <div
          ref={tip}
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full border border-cream/30 bg-panel px-2.5 py-1.5 text-[10px] uppercase whitespace-nowrap text-cream"
          style={{ left: hover.x, top: hover.y - 6 }}
        >
          {hover.day.count === 0
            ? "No contributions"
            : `${hover.day.count} contribution${hover.day.count === 1 ? "" : "s"}`}{" "}
          · {fmt(hover.day.date)}
        </div>
      ) : null}
    </section>
  );
};
